import type { Result } from "../../core/result";
import type { CharacterRecord } from "../records/library-records";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface CharacterRepository {
  getById(id: string): Promise<Result<CharacterRecord | null, StorageError>>;
  list(): Promise<Result<readonly CharacterRecord[], StorageError>>;
  put(record: CharacterRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
