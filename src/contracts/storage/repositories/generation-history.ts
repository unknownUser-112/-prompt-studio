import type { Result } from "../../core/result";
import type { GenerationHistoryRecord } from "../records/generation-history";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface GenerationHistoryRepository {
  getById(id: string): Promise<Result<GenerationHistoryRecord | null, StorageError>>;
  listByProjectId(projectId: string): Promise<Result<readonly GenerationHistoryRecord[], StorageError>>;
  put(record: GenerationHistoryRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
