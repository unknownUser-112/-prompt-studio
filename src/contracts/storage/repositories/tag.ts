import type { Result } from "../../core/result";
import type { TagRecord } from "../records/tag";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface TagRepository {
  getById(id: string): Promise<Result<TagRecord | null, StorageError>>;
  getBySlug(slug: string): Promise<Result<TagRecord | null, StorageError>>;
  list(): Promise<Result<readonly TagRecord[], StorageError>>;
  put(record: TagRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
