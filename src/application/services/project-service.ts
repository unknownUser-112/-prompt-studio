import type { DomainEvent } from "../../contracts/core/messages";
import type { Result } from "../../contracts/core/result";
import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { ProjectRepository } from "../../contracts/storage/repositories/project";
import type { ProjectRevisionRepository } from "../../contracts/storage/repositories/project-revision";
import type { SettingsRepository } from "../../contracts/storage/repositories/settings";
import type { TrashRepository } from "../../contracts/storage/repositories/trash";
import type { ProjectRevisionReason } from "../../contracts/storage/records/project-revision";
import { invalidStorageRecord, type StorageError } from "../../contracts/storage/storage-errors";
import type { StorageTransactionCoordinator } from "../../contracts/storage/transaction";
import type { Project } from "../../domain/entities/project";
import type { ProjectRevision } from "../../domain/entities/project-revision";
import type { TrashEntry } from "../../domain/entities/trash-entry";
import { createNewProject, duplicateProject } from "../../domain/entities/project-factory";
import { migrateProjectStateToCurrent } from "../migrations/v600-project-state-v3-to-v4";
import { mapProjectEntityToRecord, mapProjectRecordToEntity } from "../mappers/project-mapper";
import { mapProjectRevisionEntityToRecord, mapProjectRevisionRecordToEntity } from "../mappers/project-revision-mapper";
import { mapTrashEntryRecordToEntity } from "../mappers/trash-mapper";
import { RevisionService } from "./revision-service";

export interface ProjectEventPublisher {
  publish(event: DomainEvent<Readonly<Record<string, unknown>>>): Promise<void>;
}

export interface ProjectAutosaveControl {
  flush(trigger: "project-switch"): Promise<Result<unknown, StorageError>>;
  discard(projectId: string): void;
}

export interface ProjectServiceDependencies {
  readonly runtime: RuntimeEnvironment;
  readonly projects: ProjectRepository;
  readonly revisions: ProjectRevisionRepository;
  readonly settings: SettingsRepository;
  readonly trash: TrashRepository;
  readonly transactions: StorageTransactionCoordinator;
  readonly publisher: ProjectEventPublisher;
  readonly initialActiveProject?: Project | null;
  readonly autosave?: ProjectAutosaveControl;
}

export class ProjectService {
  private readonly runtime: RuntimeEnvironment;
  private readonly projects: ProjectRepository;
  private readonly revisions: ProjectRevisionRepository;
  private readonly settings: SettingsRepository;
  private readonly trash: TrashRepository;
  private readonly transactions: StorageTransactionCoordinator;
  private readonly publisher: ProjectEventPublisher;
  private readonly revisionService: RevisionService;
  private readonly autosave: ProjectAutosaveControl;
  private activeProject: Project | null;
  private projectSwitchTail: Promise<void> = Promise.resolve();

  constructor(dependencies: ProjectServiceDependencies) {
    this.runtime = dependencies.runtime;
    this.projects = dependencies.projects;
    this.revisions = dependencies.revisions;
    this.settings = dependencies.settings;
    this.trash = dependencies.trash;
    this.transactions = dependencies.transactions;
    this.publisher = dependencies.publisher;
    this.revisionService = new RevisionService(dependencies.runtime);
    this.autosave = dependencies.autosave ?? noAutosave;
    this.activeProject = dependencies.initialActiveProject ?? null;
  }

  public getActiveProject(): Project | null { return this.activeProject; }

  async createNew(name?: string): Promise<Result<Project, StorageError>> {
    const settingsResult = await this.settings.getByKey("global");
    if (!settingsResult.ok) return settingsResult;
    if (settingsResult.value === null) return { ok: false, error: notFound("Settings", "global") };
    const project = createNewProject(this.runtime, name);
    const existingProject = await this.projects.getById(project.id);
    if (!existingProject.ok) return existingProject;
    if (existingProject.value !== null) return { ok: false, error: conflict("Projects", project.id) };
    const revision = await this.revisionService.create(project, "created", 1, null);
    const existingRevision = await this.revisions.getById(revision.id);
    if (!existingRevision.ok) return existingRevision;
    if (existingRevision.value !== null) return { ok: false, error: conflict("ProjectRevisions", revision.id) };
    const persistedProject: Project = { ...project, currentRevisionId: revision.id };
    const timestamp = this.runtime.clock.now();
    const updatedSettings = {
      ...settingsResult.value,
      activeProjectId: project.id,
      updatedAt: timestamp,
      revision: settingsResult.value.revision + 1,
    };
    const result = await this.transactions.run(
      { stores: ["Projects", "ProjectRevisions", "Settings"], mode: "readwrite" },
      async (transaction) => {
        const projectPut = await this.projects.put(mapProjectEntityToRecord(persistedProject), transaction);
        if (!projectPut.ok) return projectPut;
        const revisionPut = await this.revisions.put(mapProjectRevisionEntityToRecord(revision), transaction);
        if (!revisionPut.ok) return revisionPut;
        const settingsPut = await this.settings.put(updatedSettings, transaction);
        return settingsPut.ok ? { ok: true as const, value: persistedProject } : settingsPut;
      },
    );
    if (!result.ok) return result;
    this.activeProject = persistedProject;
    await this.publisher.publish({
      type: "ProjectCreated",
      occurredAt: timestamp,
      payload: { projectId: persistedProject.id },
    });
    await this.publisher.publish({
      type: "ActiveProjectChanged",
      occurredAt: timestamp,
      payload: { projectId: persistedProject.id },
    });
    return result;
  }

  async duplicate(projectId: string): Promise<Result<Project, StorageError>> {
    let migratedSource: Project | null = null;
    const result = await this.transactions.run(
      { stores: ["Projects", "ProjectRevisions"], mode: "readwrite" },
      async (transaction) => {
        const sourceResult = await this.projects.getById(projectId, transaction);
        if (!sourceResult.ok) return sourceResult;
        if (sourceResult.value === null) return { ok: false as const, error: notFound("Projects", projectId) };
        const source = mapProjectRecordToEntity(sourceResult.value);
        if (!source.ok) return source;
        const upgradedSource = projectWithMigratedState(source.value);
        if (upgradedSource !== source.value) {
          const sourcePut = await this.projects.put(mapProjectEntityToRecord(upgradedSource), transaction);
          if (!sourcePut.ok) return sourcePut;
          migratedSource = upgradedSource;
        }
        const duplicate = duplicateProject(this.runtime, upgradedSource);
        const existingProject = await this.projects.getById(duplicate.id, transaction);
        if (!existingProject.ok) return existingProject;
        if (existingProject.value !== null) return { ok: false as const, error: conflict("Projects", duplicate.id) };
        const revision = await this.revisionService.create(duplicate, "duplicate", 1, null);
        const existingRevision = await this.revisions.getById(revision.id, transaction);
        if (!existingRevision.ok) return existingRevision;
        if (existingRevision.value !== null) return { ok: false as const, error: conflict("ProjectRevisions", revision.id) };
        const persisted: Project = { ...duplicate, currentRevisionId: revision.id };
        const projectPut = await this.projects.put(mapProjectEntityToRecord(persisted), transaction);
        if (!projectPut.ok) return projectPut;
        const revisionPut = await this.revisions.put(mapProjectRevisionEntityToRecord(revision), transaction);
        return revisionPut.ok ? { ok: true as const, value: persisted } : revisionPut;
      },
    );
    if (!result.ok) return result;
    if (migratedSource !== null && this.activeProject?.id === projectId) {
      this.activeProject = migratedSource;
    }
    await this.publisher.publish({
      type: "ProjectDuplicated",
      occurredAt: this.runtime.clock.now(),
      payload: { projectId: result.value.id, sourceProjectId: projectId },
    });
    return result;
  }

  async softDelete(projectId: string): Promise<Result<TrashEntry, StorageError>> {
    const wasActive = this.activeProject?.id === projectId;
    if (wasActive) {
      const flushed = await this.autosave.flush("project-switch");
      if (!flushed.ok) return flushed;
    }
    const projectResult = await this.projects.getById(projectId);
    if (!projectResult.ok) return projectResult;
    if (projectResult.value === null) return { ok: false, error: notFound("Projects", projectId) };
    const settingsResult = wasActive ? await this.settings.getByKey("global") : null;
    if (settingsResult !== null && !settingsResult.ok) return settingsResult;
    if (wasActive && settingsResult?.value === null) return { ok: false, error: notFound("Settings", "global") };
    const timestamp = this.runtime.clock.now();
    const trashRecord = {
      id: this.runtime.idGenerator.nextId("trash-entry"),
      schemaVersion: 1 as const,
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 0,
      originalStore: "Projects" as const,
      entityType: "project",
      originalId: projectId,
      payload: { ...projectResult.value },
      deletedAt: timestamp,
      restoreMetadata: { wasActive },
    };
    const existingTrash = await this.trash.getById(trashRecord.id);
    if (!existingTrash.ok) return existingTrash;
    if (existingTrash.value !== null) return { ok: false, error: conflict("Trash", trashRecord.id) };
    const updatedSettings = settingsResult?.value === undefined || settingsResult?.value === null
      ? null
      : {
          ...settingsResult.value,
          activeProjectId: null,
          updatedAt: timestamp,
          revision: settingsResult.value.revision + 1,
        };
    const stores = updatedSettings === null
      ? ["Projects", "Trash"] as const
      : ["Projects", "Trash", "Settings"] as const;
    const result = await this.transactions.run(
      { stores, mode: "readwrite" },
      async (transaction) => {
        const trashPut = await this.trash.put(trashRecord, transaction);
        if (!trashPut.ok) return trashPut;
        const projectDelete = await this.projects.delete(projectId, transaction);
        if (!projectDelete.ok) return projectDelete;
        if (updatedSettings !== null) {
          const settingsPut = await this.settings.put(updatedSettings, transaction);
          if (!settingsPut.ok) return settingsPut;
        }
        const mapped = mapTrashEntryRecordToEntity(trashRecord);
        return mapped.ok ? mapped : mapped;
      },
    );
    if (!result.ok) return result;
    if (wasActive) {
      this.activeProject = null;
      this.autosave.discard(projectId);
    }
    await this.publisher.publish({
      type: "ProjectSoftDeleted",
      occurredAt: timestamp,
      payload: { projectId, trashEntryId: result.value.id },
    });
    return result;
  }

  async restore(trashEntryId: string): Promise<Result<Project, StorageError>> {
    const timestamp = this.runtime.clock.now();
    const result = await this.transactions.run(
      { stores: ["Projects", "ProjectRevisions", "Trash"], mode: "readwrite" },
      async (transaction) => {
        const trashResult = await this.trash.getById(trashEntryId, transaction);
        if (!trashResult.ok) return trashResult;
        if (trashResult.value === null) return { ok: false as const, error: notFound("Trash", trashEntryId) };
        if (trashResult.value.originalStore !== "Projects" || trashResult.value.entityType !== "project") {
          return { ok: false as const, error: invalidStorageRecord("trash project", "original store or entity type") };
        }
        const project = mapProjectRecordToEntity(trashResult.value.payload);
        if (!project.ok) return project;
        const upgraded = projectWithMigratedState(project.value);
        const existing = await this.projects.getById(upgraded.id, transaction);
        if (!existing.ok) return existing;
        if (existing.value !== null) return { ok: false as const, error: conflict("Projects", upgraded.id) };
        const prior = await this.revisions.listByProjectId(upgraded.id, transaction);
        if (!prior.ok) return prior;
        const sequence = prior.value.reduce((maximum, entry) => Math.max(maximum, entry.sequence), 0) + 1;
        const restorationBase: Project = {
          ...upgraded,
          lifecycleStatus: "active",
          updatedAt: timestamp,
          revision: upgraded.revision + 1,
        };
        const revision = await this.revisionService.create(restorationBase, "restore", sequence);
        const existingRevision = await this.revisions.getById(revision.id, transaction);
        if (!existingRevision.ok) return existingRevision;
        if (existingRevision.value !== null) return { ok: false as const, error: conflict("ProjectRevisions", revision.id) };
        const restored: Project = { ...restorationBase, currentRevisionId: revision.id };
        const revisionPut = await this.revisions.put(mapProjectRevisionEntityToRecord(revision), transaction);
        if (!revisionPut.ok) return revisionPut;
        const projectPut = await this.projects.put(mapProjectEntityToRecord(restored), transaction);
        if (!projectPut.ok) return projectPut;
        const trashDelete = await this.trash.delete(trashEntryId, transaction);
        return trashDelete.ok ? { ok: true as const, value: restored } : trashDelete;
      },
    );
    if (!result.ok) return result;
    await this.publisher.publish({
      type: "ProjectRestored",
      occurredAt: timestamp,
      payload: { projectId: result.value.id, trashEntryId },
    });
    return result;
  }

  async restoreRevision(revisionId: string): Promise<Result<Project, StorageError>> {
    const timestamp = this.runtime.clock.now();
    const result = await this.transactions.run(
      { stores: ["Projects", "ProjectRevisions"], mode: "readwrite" },
      async (transaction) => {
        const historicalResult = await this.revisions.getById(revisionId, transaction);
        if (!historicalResult.ok) return historicalResult;
        if (historicalResult.value === null) return { ok: false as const, error: notFound("ProjectRevisions", revisionId) };
        const historical = mapProjectRevisionRecordToEntity(historicalResult.value);
        if (!historical.ok) return historical;
        const currentRecord = await this.projects.getById(historical.value.projectId, transaction);
        if (!currentRecord.ok) return currentRecord;
        if (currentRecord.value === null) {
          return { ok: false as const, error: notFound("Projects", historical.value.projectId) };
        }
        const snapshot = historical.value.snapshot;
        const snapshotProject = mapProjectRecordToEntity({
          ...currentRecord.value,
          name: snapshot.name,
          state: snapshot.state,
          lifecycleStatus: "active",
          tagIds: snapshot.tagIds,
        });
        if (!snapshotProject.ok) return snapshotProject;
        const upgraded = projectWithMigratedState(snapshotProject.value);
        const prior = await this.revisions.listByProjectId(upgraded.id, transaction);
        if (!prior.ok) return prior;
        const sequence = prior.value.reduce((maximum, entry) => Math.max(maximum, entry.sequence), 0) + 1;
        const restorationBase: Project = {
          ...upgraded,
          lifecycleStatus: "active",
          updatedAt: timestamp,
          revision: currentRecord.value.revision + 1,
        };
        const revision = await this.revisionService.create(restorationBase, "restore", sequence, historical.value.id);
        const existingRevision = await this.revisions.getById(revision.id, transaction);
        if (!existingRevision.ok) return existingRevision;
        if (existingRevision.value !== null) return { ok: false as const, error: conflict("ProjectRevisions", revision.id) };
        const restored: Project = { ...restorationBase, currentRevisionId: revision.id };
        const revisionPut = await this.revisions.put(mapProjectRevisionEntityToRecord(revision), transaction);
        if (!revisionPut.ok) return revisionPut;
        const projectPut = await this.projects.put(mapProjectEntityToRecord(restored), transaction);
        return projectPut.ok ? { ok: true as const, value: restored } : projectPut;
      },
    );
    if (result.ok && this.activeProject?.id === result.value.id) this.activeProject = result.value;
    return result;
  }

  load(id: string): Promise<Result<Project, StorageError>> {
    const operation = this.projectSwitchTail.then(() => this.performLoad(id));
    this.projectSwitchTail = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async performLoad(id: string): Promise<Result<Project, StorageError>> {
    const flushed = await this.autosave.flush("project-switch");
    if (!flushed.ok) return flushed;
    const timestamp = this.runtime.clock.now();
    const committed = await this.transactions.run(
      { stores: ["Projects", "Settings"], mode: "readwrite" },
      async (transaction) => {
        const result = await this.projects.getById(id, transaction);
        if (!result.ok) return result;
        if (result.value === null) return { ok: false as const, error: notFound("Projects", id) };
        const mapped = mapProjectRecordToEntity(result.value);
        if (!mapped.ok) return mapped;
        const upgraded = projectWithMigratedState(mapped.value);
        const settingsResult = await this.settings.getByKey("global", transaction);
        if (!settingsResult.ok) return settingsResult;
        if (settingsResult.value === null) return { ok: false as const, error: notFound("Settings", "global") };
        if (upgraded !== mapped.value) {
          const projectPut = await this.projects.put(mapProjectEntityToRecord(upgraded), transaction);
          if (!projectPut.ok) return projectPut;
        }
        const updatedSettings = {
          ...settingsResult.value,
          activeProjectId: upgraded.id,
          updatedAt: timestamp,
          revision: settingsResult.value.revision + 1,
        };
        const put = await this.settings.put(updatedSettings, transaction);
        return put.ok ? { ok: true as const, value: upgraded } : put;
      },
    );
    if (!committed.ok) return committed;
    this.activeProject = committed.value;
    await this.publisher.publish({
      type: "ActiveProjectChanged",
      occurredAt: timestamp,
      payload: { projectId: committed.value.id },
    });
    return committed;
  }

  async list(): Promise<Result<readonly Project[], StorageError>> {
    const result = await this.projects.list();
    if (!result.ok) return result;
    const projects: Project[] = [];
    for (const record of result.value) {
      const mapped = mapProjectRecordToEntity(record);
      if (!mapped.ok) return mapped;
      projects.push(mapped.value);
    }
    return { ok: true, value: projects };
  }

  async update(project: Project): Promise<Result<Project, StorageError>> {
    const existing = await this.projects.getById(project.id);
    if (!existing.ok) return existing;
    if (existing.value === null) return { ok: false, error: notFound("Projects", project.id) };
    const updated: Project = {
      ...project,
      createdAt: existing.value.createdAt,
      updatedAt: this.runtime.clock.now(),
      revision: existing.value.revision + 1,
    };
    const persisted = await this.transactions.run(
      { stores: ["Projects"], mode: "readwrite" },
      async (transaction) => {
        const put = await this.projects.put(mapProjectEntityToRecord(updated), transaction);
        return put.ok ? { ok: true as const, value: updated } : put;
      },
    );
    if (persisted.ok && this.activeProject?.id === updated.id) this.activeProject = updated;
    return persisted;
  }

  async recordRevision(projectId: string, reason: Extract<ProjectRevisionReason, "import" | "migration" | "milestone">): Promise<Result<ProjectRevision, StorageError>> {
    const projectResult = await this.projects.getById(projectId);
    if (!projectResult.ok) return projectResult;
    if (projectResult.value === null) return { ok: false, error: notFound("Projects", projectId) };
    const mapped = mapProjectRecordToEntity(projectResult.value);
    if (!mapped.ok) return mapped;
    const prior = await this.revisions.listByProjectId(projectId);
    if (!prior.ok) return prior;
    const nextSequence = prior.value.reduce((maximum, revision) => Math.max(maximum, revision.sequence), 0) + 1;
    const revision = await this.revisionService.create(mapped.value, reason, nextSequence);
    const existingRevision = await this.revisions.getById(revision.id);
    if (!existingRevision.ok) return existingRevision;
    if (existingRevision.value !== null) return { ok: false, error: conflict("ProjectRevisions", revision.id) };
    const updatedProject: Project = {
      ...mapped.value,
      currentRevisionId: revision.id,
      updatedAt: this.runtime.clock.now(),
      revision: mapped.value.revision + 1,
    };
    const persisted = await this.transactions.run(
      { stores: ["Projects", "ProjectRevisions"], mode: "readwrite" },
      async (transaction) => {
        const revisionPut = await this.revisions.put(mapProjectRevisionEntityToRecord(revision), transaction);
        if (!revisionPut.ok) return revisionPut;
        const projectPut = await this.projects.put(mapProjectEntityToRecord(updatedProject), transaction);
        return projectPut.ok ? { ok: true as const, value: revision } : projectPut;
      },
    );
    if (persisted.ok && this.activeProject?.id === projectId) this.activeProject = updatedProject;
    return persisted;
  }
}

function projectWithMigratedState(project: Project): Project {
  const state = migrateProjectStateToCurrent(project.state);
  return state === project.state ? project : { ...project, state };
}

const noAutosave: ProjectAutosaveControl = {
  flush: async () => ({ ok: true, value: null }),
  discard: () => undefined,
};

function notFound(store: StorageError["store"], id: string): StorageError {
  return {
    code: "storage/not-found",
    moduleId: "storage",
    severity: "error",
    userMessage: "The requested data was not found.",
    technicalMessage: `${store ?? "Storage"} record not found: ${id}`,
    recoverable: true,
    ...(store === undefined ? {} : { store }),
  };
}

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
