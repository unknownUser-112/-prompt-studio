import type { SyncQueueRepository } from "../../../contracts/storage/repositories/sync-queue";
import type { SyncOperationKind, SyncOperationStatus, SyncQueueRecord } from "../../../contracts/storage/records/sync-queue";
import { isStorageObject, isStorageRecordMetadata } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

const OPERATIONS: readonly SyncOperationKind[] = ["create", "update", "delete"];
const STATUSES: readonly SyncOperationStatus[] = ["pending", "processing", "failed", "completed"];

export class IndexedDbSyncQueueRepository implements SyncQueueRepository {
  private readonly records: IndexedDbRecordStore<SyncQueueRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "SyncQueue", "sync queue", isSyncQueueRecord);
  }

  public getById: SyncQueueRepository["getById"] = (id) => this.records.get(id);
  public listPending: SyncQueueRepository["listPending"] = () => this.records.listByIndex("status", "pending");
  public put: SyncQueueRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: SyncQueueRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isSyncQueueRecord(value: unknown): value is SyncQueueRecord {
  return isStorageRecordMetadata(value) && typeof value.entityType === "string" && typeof value.entityId === "string" &&
    OPERATIONS.includes(value.operation as SyncOperationKind) &&
    (value.baseRevision === null || Number.isInteger(value.baseRevision)) && isStorageObject(value.payload) &&
    typeof value.payloadHash === "string" && STATUSES.includes(value.status as SyncOperationStatus);
}
