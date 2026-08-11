import type { CharacterRepository } from "../../../contracts/storage/repositories/character";
import type { CharacterRecord } from "../../../contracts/storage/records/library-records";
import { isNullableString, isStorageObject, isStorageRecordMetadata, isStringArray } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbCharacterRepository implements CharacterRepository {
  private readonly records: IndexedDbRecordStore<CharacterRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "Characters", "character", isCharacterRecord);
  }

  public getById: CharacterRepository["getById"] = (id) => this.records.get(id);
  public list: CharacterRepository["list"] = () => this.records.list();
  public put: CharacterRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: CharacterRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isCharacterRecord(value: unknown): value is CharacterRecord {
  return isStorageRecordMetadata(value) && typeof value.name === "string" && isStorageObject(value.payload) &&
    isStringArray(value.tagIds) && isNullableString(value.sourceProjectId);
}
