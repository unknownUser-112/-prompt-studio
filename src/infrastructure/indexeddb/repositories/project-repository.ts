import type { ProjectRepository } from "../../../contracts/storage/repositories/project";
import type { ProjectRecord } from "../../../contracts/storage/records/project";
import {
  isNullableString,
  isStorageObject,
  isStorageRecordMetadata,
  isStringArray,
} from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbProjectRepository implements ProjectRepository {
  private readonly records: IndexedDbRecordStore<ProjectRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "Projects", "project", isProjectRecord);
  }

  public getById: ProjectRepository["getById"] = (id) => this.records.get(id);
  public list: ProjectRepository["list"] = () => this.records.list();
  public put: ProjectRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: ProjectRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isProjectRecord(value: unknown): value is ProjectRecord {
  return isStorageRecordMetadata(value) &&
    typeof value.name === "string" &&
    isStorageObject(value.state) &&
    isNullableString(value.currentRevisionId) &&
    isNullableString(value.autosavedAt) &&
    (value.lifecycleStatus === "active" || value.lifecycleStatus === "archived") &&
    isStringArray(value.tagIds);
}
