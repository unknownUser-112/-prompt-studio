import type { Result } from "../../core/result";
import type { OutfitRecord } from "../records/library-records";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface OutfitRepository {
  getById(id: string): Promise<Result<OutfitRecord | null, StorageError>>;
  list(): Promise<Result<readonly OutfitRecord[], StorageError>>;
  put(record: OutfitRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
