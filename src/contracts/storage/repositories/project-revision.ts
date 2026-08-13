import type { Result } from "../../core/result";
import type { ProjectRevisionRecord } from "../records/project-revision";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface ProjectRevisionRepository {
  getById(id: string, transaction?: StorageTransaction): Promise<Result<ProjectRevisionRecord | null, StorageError>>;
  listByProjectId(projectId: string, transaction?: StorageTransaction): Promise<Result<readonly ProjectRevisionRecord[], StorageError>>;
  put(record: ProjectRevisionRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
