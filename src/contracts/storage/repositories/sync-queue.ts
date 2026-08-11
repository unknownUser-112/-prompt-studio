import type { Result } from "../../core/result";
import type { SyncQueueRecord } from "../records/sync-queue";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface SyncQueueRepository {
  getById(id: string): Promise<Result<SyncQueueRecord | null, StorageError>>;
  listPending(): Promise<Result<readonly SyncQueueRecord[], StorageError>>;
  put(record: SyncQueueRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
