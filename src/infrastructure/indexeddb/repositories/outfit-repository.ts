import type { OutfitRepository } from "../../../contracts/storage/repositories/outfit";
import type { OutfitRecord } from "../../../contracts/storage/records/library-records";
import { isNullableString, isStorageObject, isStorageRecordMetadata, isStringArray } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbOutfitRepository implements OutfitRepository {
  private readonly records: IndexedDbRecordStore<OutfitRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "Outfits", "outfit", isOutfitRecord);
  }

  public getById: OutfitRepository["getById"] = (id) => this.records.get(id);
  public list: OutfitRepository["list"] = () => this.records.list();
  public put: OutfitRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: OutfitRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isOutfitRecord(value: unknown): value is OutfitRecord {
  return isStorageRecordMetadata(value) && typeof value.name === "string" && isStorageObject(value.payload) &&
    isStringArray(value.tagIds) && isNullableString(value.sourceProjectId);
}
