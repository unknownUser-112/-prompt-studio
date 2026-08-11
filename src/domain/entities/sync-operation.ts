import type { DomainObject } from "./project";

export type SyncOperationKind = "create" | "update" | "delete";
export type SyncOperationStatus = "pending" | "processing" | "failed" | "completed";

export interface SyncOperation {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly entityType: string;
  readonly entityId: string;
  readonly operation: SyncOperationKind;
  readonly baseRevision: number | null;
  readonly payload: DomainObject;
  readonly payloadHash: string;
  readonly status: SyncOperationStatus;
}
