import type { GenerationHistoryRepository } from "../../../contracts/storage/repositories/generation-history";
import type { GenerationHistoryRecord } from "../../../contracts/storage/records/generation-history";
import { isStorageObject, isStorageRecordMetadata } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbGenerationHistoryRepository implements GenerationHistoryRepository {
  private readonly records: IndexedDbRecordStore<GenerationHistoryRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "GenerationHistory", "generation history", isGenerationHistoryRecord);
  }

  public getById: GenerationHistoryRepository["getById"] = (id) => this.records.get(id);
  public listByProjectId: GenerationHistoryRepository["listByProjectId"] = (projectId) =>
    this.records.listByIndex("projectId", projectId);
  public put: GenerationHistoryRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: GenerationHistoryRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isGenerationHistoryRecord(value: unknown): value is GenerationHistoryRecord {
  return isStorageRecordMetadata(value) && typeof value.projectId === "string" && typeof value.profileId === "string" &&
    isStorageObject(value.promptResult) && typeof value.resolvedStateHash === "string" &&
    isStorageObject(value.diagnosticSummary);
}
