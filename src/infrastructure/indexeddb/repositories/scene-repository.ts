import type { SceneRepository } from "../../../contracts/storage/repositories/scene";
import type { SceneRecord } from "../../../contracts/storage/records/library-records";
import { isNullableString, isStorageObject, isStorageRecordMetadata, isStringArray } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbSceneRepository implements SceneRepository {
  private readonly records: IndexedDbRecordStore<SceneRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "Scenes", "scene", isSceneRecord);
  }

  public getById: SceneRepository["getById"] = (id) => this.records.get(id);
  public list: SceneRepository["list"] = () => this.records.list();
  public put: SceneRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: SceneRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isSceneRecord(value: unknown): value is SceneRecord {
  return isStorageRecordMetadata(value) && typeof value.name === "string" && isStorageObject(value.payload) &&
    isStringArray(value.tagIds) && isNullableString(value.sourceProjectId);
}
