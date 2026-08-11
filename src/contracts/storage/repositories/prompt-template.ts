import type { Result } from "../../core/result";
import type { PromptTemplateRecord } from "../records/library-records";
import type { StorageError } from "../storage-errors";
import type { StorageTransaction } from "../transaction";

export interface PromptTemplateRepository {
  getById(id: string): Promise<Result<PromptTemplateRecord | null, StorageError>>;
  list(): Promise<Result<readonly PromptTemplateRecord[], StorageError>>;
  put(record: PromptTemplateRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
  delete(id: string, transaction?: StorageTransaction): Promise<Result<void, StorageError>>;
}
