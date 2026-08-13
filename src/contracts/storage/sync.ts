import type { Result } from "../core/result";
import type { SyncQueueRecord } from "./records/sync-queue";
import type { StorageError } from "./storage-errors";

export interface LocalSyncPort {
  readonly mode: "local-only";
  readonly cloudSync: false;
  listPending(): Promise<Result<readonly SyncQueueRecord[], StorageError>>;
}
