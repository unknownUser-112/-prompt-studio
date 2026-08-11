export type AutosaveFlushTrigger =
  | "debounce"
  | "navigation"
  | "import"
  | "export"
  | "visibilitychange"
  | "stop"
  | "project-switch";

import type { Result } from "../../contracts/core/result";
import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { ProjectRepository } from "../../contracts/storage/repositories/project";
import type { ProjectRevisionRepository } from "../../contracts/storage/repositories/project-revision";
import type { StorageError } from "../../contracts/storage/storage-errors";
import type { StorageTransactionCoordinator } from "../../contracts/storage/transaction";
import type { Project } from "../../domain/entities/project";
import { mapProjectEntityToRecord } from "../mappers/project-mapper";
import { mapProjectRevisionEntityToRecord } from "../mappers/project-revision-mapper";
import { RevisionService } from "./revision-service";

export interface AutosaveScheduler {
  schedule(callback: () => void | Promise<void>, delayMilliseconds: number): object;
  cancel(handle: object): void;
}

export interface AutosaveServiceDependencies {
  readonly runtime: RuntimeEnvironment;
  readonly projects: ProjectRepository;
  readonly revisions: ProjectRevisionRepository;
  readonly transactions: StorageTransactionCoordinator;
  readonly scheduler?: AutosaveScheduler;
  readonly initialConfirmedProject?: Project | null;
}

export interface RecoveryState {
  readonly confirmed: Project | null;
  readonly pending: Project | null;
}

export const AUTOSAVE_DEBOUNCE_MILLISECONDS = 750;
export const AUTOSAVE_REVISION_INTERVAL_MILLISECONDS = 300_000;

export class AutosaveService {
  private readonly runtime: RuntimeEnvironment;
  private readonly projects: ProjectRepository;
  private readonly revisions: ProjectRevisionRepository;
  private readonly transactions: StorageTransactionCoordinator;
  private readonly scheduler: AutosaveScheduler;
  private readonly revisionService: RevisionService;
  private confirmed: Project | null;
  private pending: Project | null = null;
  private timer: object | null = null;
  private activeChangesSince: number | null = null;
  private latestChangeAt: number | null = null;
  private pendingGeneration = 0;

  public constructor(dependencies: AutosaveServiceDependencies) {
    this.runtime = dependencies.runtime;
    this.projects = dependencies.projects;
    this.revisions = dependencies.revisions;
    this.transactions = dependencies.transactions;
    this.scheduler = dependencies.scheduler ?? browserScheduler;
    this.revisionService = new RevisionService(dependencies.runtime);
    this.confirmed = dependencies.initialConfirmedProject ?? null;
  }

  public schedule(project: Project): void {
    this.pending = project;
    const now = this.runtime.monotonicClock.nowMilliseconds();
    this.pendingGeneration += 1;
    this.latestChangeAt = now;
    this.activeChangesSince ??= now;
    const revisionDeadlineDelay = Math.max(
      0,
      AUTOSAVE_REVISION_INTERVAL_MILLISECONDS - (now - this.activeChangesSince),
    );
    const delay = Math.min(AUTOSAVE_DEBOUNCE_MILLISECONDS, revisionDeadlineDelay);
    if (this.timer !== null) this.scheduler.cancel(this.timer);
    this.timer = this.scheduler.schedule(
      async () => { await this.flush("debounce"); },
      delay,
    );
  }

  public getRecoveryState(): RecoveryState {
    return { confirmed: this.confirmed, pending: this.pending };
  }

  public discard(projectId: string): void {
    if (this.pending?.id !== projectId && this.confirmed?.id !== projectId) return;
    if (this.timer !== null) {
      this.scheduler.cancel(this.timer);
      this.timer = null;
    }
    if (this.pending?.id === projectId) this.pending = null;
    if (this.confirmed?.id === projectId) this.confirmed = null;
    this.activeChangesSince = null;
    this.latestChangeAt = null;
    this.pendingGeneration += 1;
  }

  public async flush(_trigger: AutosaveFlushTrigger): Promise<Result<Project | null, StorageError>> {
    if (this.pending === null) return { ok: true, value: this.confirmed };
    if (this.timer !== null) {
      this.scheduler.cancel(this.timer);
      this.timer = null;
    }
    const pending = this.pending;
    const generation = this.pendingGeneration;
    const timestamp = this.runtime.clock.now();
    const baseRevision = this.confirmed?.id === pending.id ? this.confirmed.revision : pending.revision;
    let persisted: Project = {
      ...pending,
      updatedAt: timestamp,
      autosavedAt: timestamp,
      revision: baseRevision + 1,
    };
    const revisionDue = this.activeChangesSince !== null &&
      this.runtime.monotonicClock.nowMilliseconds() - this.activeChangesSince >= AUTOSAVE_REVISION_INTERVAL_MILLISECONDS;
    let revision = null;
    if (revisionDue) {
      const previous = await this.revisions.listByProjectId(persisted.id);
      if (!previous.ok) return previous;
      const sequence = previous.value.reduce((maximum, entry) => Math.max(maximum, entry.sequence), 0) + 1;
      revision = await this.revisionService.create(persisted, "autosave", sequence);
      const existingRevision = await this.revisions.getById(revision.id);
      if (!existingRevision.ok) return existingRevision;
      if (existingRevision.value !== null) {
        return { ok: false, error: conflict("ProjectRevisions", revision.id) };
      }
      persisted = { ...persisted, currentRevisionId: revision.id };
    }
    const stores = revision === null
      ? ["Projects"] as const
      : ["Projects", "ProjectRevisions"] as const;
    const result = await this.transactions.run(
      { stores, mode: "readwrite" },
      async (transaction) => {
        if (revision !== null) {
          const revisionPut = await this.revisions.put(mapProjectRevisionEntityToRecord(revision), transaction);
          if (!revisionPut.ok) return revisionPut;
        }
        const projectPut = await this.projects.put(mapProjectEntityToRecord(persisted), transaction);
        return projectPut.ok ? { ok: true as const, value: persisted } : projectPut;
      },
    );
    if (!result.ok) return result;
    this.confirmed = result.value;
    if (this.pendingGeneration === generation) {
      this.pending = null;
      this.latestChangeAt = null;
      if (revision !== null) this.activeChangesSince = null;
    } else if (revision !== null) {
      this.activeChangesSince = this.latestChangeAt;
    }
    return result;
  }
}

const browserScheduler: AutosaveScheduler = {
  schedule(callback, delayMilliseconds) {
    const id = setTimeout(() => { void callback(); }, delayMilliseconds);
    return { id };
  },
  cancel(handle) {
    clearTimeout((handle as { readonly id: ReturnType<typeof setTimeout> }).id);
  },
};

function conflict(store: StorageError["store"], id: string): StorageError {
  return {
    code: "storage/conflict",
    moduleId: "storage",
    severity: "error",
    userMessage: "The data conflicts with an existing record.",
    technicalMessage: `${store ?? "Storage"} record already exists: ${id}`,
    recoverable: true,
    ...(store === undefined ? {} : { store }),
  };
}
