import type { Command } from "../../contracts/core/messages";
import type { Result } from "../../contracts/core/result";
import type { StorageError } from "../../contracts/storage/storage-errors";
import type { DomainObject } from "../../domain/entities/project";
import type { Project } from "../../domain/entities/project";
import type { AutosaveFlushTrigger } from "../services/autosave-service";
import type { ProjectService } from "../services/project-service";

export interface CreateNewProjectPayload {
  readonly confirmed: boolean;
  readonly name?: string;
}

export interface UpdateProjectPayload {
  readonly projectId: string;
  readonly name: string;
  readonly state: DomainObject;
}

export interface ProjectIdPayload { readonly projectId: string; }
export interface RestoreProjectPayload { readonly trashEntryId: string; }
export interface FlushAutosavePayload { readonly trigger: AutosaveFlushTrigger; }

export const createNewProjectCommand = (payload: CreateNewProjectPayload): Command<CreateNewProjectPayload, unknown> => ({ type: "project/create-new", payload });
export const updateProjectCommand = (payload: UpdateProjectPayload): Command<UpdateProjectPayload, unknown> => ({ type: "project/update", payload });
export const duplicateProjectCommand = (payload: ProjectIdPayload): Command<ProjectIdPayload, unknown> => ({ type: "project/duplicate", payload });
export const softDeleteProjectCommand = (payload: ProjectIdPayload): Command<ProjectIdPayload, unknown> => ({ type: "project/soft-delete", payload });
export const restoreProjectCommand = (payload: RestoreProjectPayload): Command<RestoreProjectPayload, unknown> => ({ type: "project/restore", payload });
export const flushAutosaveCommand = (payload: FlushAutosavePayload): Command<FlushAutosavePayload, unknown> => ({ type: "project/flush-autosave", payload });

export interface AutosaveFlusher {
  flush(trigger: AutosaveFlushTrigger): Promise<Result<unknown, StorageError>>;
}

export class CreateNewProjectCommandHandler {
  private inFlight: Promise<Result<Project | null, StorageError>> | null = null;

  public constructor(
    private readonly projects: Pick<ProjectService, "createNew">,
    private readonly autosave: AutosaveFlusher,
  ) {}

  public handle(command: Command<CreateNewProjectPayload, unknown>): Promise<Result<Project | null, StorageError>> {
    if (!command.payload.confirmed) return Promise.resolve({ ok: true, value: null });
    if (this.inFlight !== null) return this.inFlight;
    const operation = this.execute(command.payload.name);
    this.inFlight = operation;
    void operation.finally(() => {
      if (this.inFlight === operation) this.inFlight = null;
    });
    return operation;
  }

  private async execute(name: string | undefined): Promise<Result<Project, StorageError>> {
    const flushed = await this.autosave.flush("project-switch");
    if (!flushed.ok) return flushed;
    return this.projects.createNew(name);
  }
}
