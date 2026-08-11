import type { StorageObject, StorageRecordMetadata } from "./project";

export type SyncOperationKind = "create" | "update" | "delete";
export type SyncOperationStatus = "pending" | "processing" | "failed" | "completed";

export interface SyncQueueRecord extends StorageRecordMetadata {
  readonly entityType: string;
  readonly entityId: string;
  readonly operation: SyncOperationKind;
  readonly baseRevision: number | null;
  readonly payload: StorageObject;
  readonly payloadHash: string;
  readonly status: SyncOperationStatus;
}
