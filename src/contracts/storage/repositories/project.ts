import type { Result } from "../../core/result";
import type { ProjectRecord } from "../records/project";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface ProjectRepository {
  getById(id: string): Promise<Result<ProjectRecord | null, StorageError>>;
  list(): Promise<Result<readonly ProjectRecord[], StorageError>>;
  put(record: ProjectRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
