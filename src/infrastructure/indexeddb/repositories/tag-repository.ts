import type { TagRepository } from "../../../contracts/storage/repositories/tag";
import type { TagRecord } from "../../../contracts/storage/records/tag";
import { isNullableString, isStorageRecordMetadata } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbTagRepository implements TagRepository {
  private readonly records: IndexedDbRecordStore<TagRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "Tags", "tag", isTagRecord);
  }

  public getById: TagRepository["getById"] = (id) => this.records.get(id);
  public getBySlug: TagRepository["getBySlug"] = (slug) => this.records.firstByIndex("slug", slug);
  public list: TagRepository["list"] = () => this.records.list();
  public put: TagRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: TagRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isTagRecord(value: unknown): value is TagRecord {
  return isStorageRecordMetadata(value) && typeof value.slug === "string" && typeof value.name === "string" &&
    isNullableString(value.color);
}
