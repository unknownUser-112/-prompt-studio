import type { Result } from "../../core/result";
import type { TrashRecord } from "../records/trash";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface TrashRepository {
  getById(id: string, transaction?: StorageTransaction): Promise<Result<TrashRecord | null, StorageError>>;
  list(): Promise<Result<readonly TrashRecord[], StorageError>>;
  put(record: TrashRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
