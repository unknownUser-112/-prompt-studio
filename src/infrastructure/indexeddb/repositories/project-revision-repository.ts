import type { ProjectRevisionRepository } from "../../../contracts/storage/repositories/project-revision";
import type { ProjectRevisionRecord, ProjectRevisionReason } from "../../../contracts/storage/records/project-revision";
import {
  isNullableString,
  isStorageObject,
  isStorageRecordMetadata,
} from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

const REASONS: readonly ProjectRevisionReason[] = [
  "created",
  "autosave",
  "manual-save",
  "import",
  "migration",
  "duplicate",
  "restore",
  "milestone",
];

export class IndexedDbProjectRevisionRepository implements ProjectRevisionRepository {
  private readonly records: IndexedDbRecordStore<ProjectRevisionRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "ProjectRevisions", "project revision", isProjectRevisionRecord);
  }

  public getById: ProjectRevisionRepository["getById"] = (id) => this.records.get(id);
  public async listByProjectId(projectId: string) {
    const result = await this.records.listByIndex("projectId", projectId);
    if (!result.ok) return result;
    return { ok: true as const, value: [...result.value].sort((left, right) => left.sequence - right.sequence) };
  }
  public put: ProjectRevisionRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: ProjectRevisionRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isProjectRevisionRecord(value: unknown): value is ProjectRevisionRecord {
  return isStorageRecordMetadata(value) &&
    typeof value.projectId === "string" &&
    Number.isInteger(value.sequence) &&
    REASONS.includes(value.reason as ProjectRevisionReason) &&
    isNullableString(value.parentRevisionId) &&
    isStorageObject(value.snapshot) &&
    typeof value.sha256 === "string";
}
