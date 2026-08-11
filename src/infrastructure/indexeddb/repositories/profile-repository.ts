import type { ProfileRepository } from "../../../contracts/storage/repositories/profile";
import type { ProfileRecord } from "../../../contracts/storage/records/profile";
import { isStorageObject, isStorageRecordMetadata } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbProfileRepository implements ProfileRepository {
  private readonly records: IndexedDbRecordStore<ProfileRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "Profiles", "profile", isProfileRecord);
  }

  public getById: ProfileRepository["getById"] = (id) => this.records.get(id);
  public list: ProfileRepository["list"] = () => this.records.list();
  public put: ProfileRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: ProfileRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isProfileRecord(value: unknown): value is ProfileRecord {
  return isStorageRecordMetadata(value) &&
    (value.kind === "built-in" || value.kind === "custom") &&
    typeof value.name === "string" &&
    typeof value.strategyId === "string" &&
    typeof value.strategyVersion === "string" &&
    isStorageObject(value.configuration);
}
