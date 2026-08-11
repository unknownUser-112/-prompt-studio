import type { Result } from "../../core/result";
import type { ImageAssetRecord } from "../records/image-asset";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface ImageAssetRepository {
  getById(id: string): Promise<Result<ImageAssetRecord | null, StorageError>>;
  getBySha256(sha256: string): Promise<Result<ImageAssetRecord | null, StorageError>>;
  put(record: ImageAssetRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
