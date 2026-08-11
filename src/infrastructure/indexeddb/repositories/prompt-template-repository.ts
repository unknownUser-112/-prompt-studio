import type { PromptTemplateRepository } from "../../../contracts/storage/repositories/prompt-template";
import type { PromptTemplateRecord } from "../../../contracts/storage/records/library-records";
import { isNullableString, isStorageObject, isStorageRecordMetadata, isStringArray } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbPromptTemplateRepository implements PromptTemplateRepository {
  private readonly records: IndexedDbRecordStore<PromptTemplateRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "PromptTemplates", "prompt template", isPromptTemplateRecord);
  }

  public getById: PromptTemplateRepository["getById"] = (id) => this.records.get(id);
  public list: PromptTemplateRepository["list"] = () => this.records.list();
  public put: PromptTemplateRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: PromptTemplateRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isPromptTemplateRecord(value: unknown): value is PromptTemplateRecord {
  return isStorageRecordMetadata(value) && typeof value.name === "string" && isStorageObject(value.payload) &&
    isStringArray(value.tagIds) && isNullableString(value.sourceProjectId);
}
