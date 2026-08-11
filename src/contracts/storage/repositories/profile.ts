import type { Result } from "../../core/result";
import type { ProfileRecord } from "../records/profile";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface ProfileRepository {
  getById(id: string): Promise<Result<ProfileRecord | null, StorageError>>;
  list(): Promise<Result<readonly ProfileRecord[], StorageError>>;
  put(record: ProfileRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
