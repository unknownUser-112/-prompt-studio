import type { TrashRepository } from "../../../contracts/storage/repositories/trash";
import type { TrashRecord } from "../../../contracts/storage/records/trash";
import { isStorageObject, isStorageRecordMetadata } from "../../../contracts/storage/storage-errors";
import { STORE_NAMES, type StoreName } from "../../../contracts/storage/store-names";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbTrashRepository implements TrashRepository {
  private readonly records: IndexedDbRecordStore<TrashRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "Trash", "trash", isTrashRecord);
  }

  public getById: TrashRepository["getById"] = (id) => this.records.get(id);
  public list: TrashRepository["list"] = () => this.records.list();
  public put: TrashRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: TrashRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isTrashRecord(value: unknown): value is TrashRecord {
  return isStorageRecordMetadata(value) && STORE_NAMES.includes(value.originalStore as StoreName) &&
    typeof value.entityType === "string" && typeof value.originalId === "string" && isStorageObject(value.payload) &&
    typeof value.deletedAt === "string" && isStorageObject(value.restoreMetadata);
}
