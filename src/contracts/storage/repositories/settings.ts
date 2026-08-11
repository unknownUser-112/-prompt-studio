import type { Result } from "../../core/result";
import type { SettingsRecord } from "../records/settings";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface SettingsRepository {
  getByKey(key: string): Promise<Result<SettingsRecord | null, StorageError>>;
  list(): Promise<Result<readonly SettingsRecord[], StorageError>>;
  put(record: SettingsRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(key: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
