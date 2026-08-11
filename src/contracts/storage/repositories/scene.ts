import type { Result } from "../../core/result";
import type { SceneRecord } from "../records/library-records";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface SceneRepository {
  getById(id: string): Promise<Result<SceneRecord | null, StorageError>>;
  list(): Promise<Result<readonly SceneRecord[], StorageError>>;
  put(record: SceneRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
