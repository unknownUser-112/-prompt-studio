import type { Result } from "../../contracts/core/result";
import type { SyncQueueRecord } from "../../contracts/storage/records/sync-queue";
import {
  invalidStorageRecord,
  isStorageObject,
  isStorageRecordMetadata,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { SyncOperation } from "../../domain/entities/sync-operation";

export const SYNC_OPERATION_MAPPER_VERSION = 1 as const;
const OPERATIONS = ["create", "update", "delete"] as const;
const STATUSES = ["pending", "processing", "failed", "completed"] as const;

export function mapSyncOperationRecordToEntity(record: unknown): Result<SyncOperation, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    typeof record.entityType !== "string" ||
    typeof record.entityId !== "string" ||
    !OPERATIONS.includes(record.operation as (typeof OPERATIONS)[number]) ||
    !(record.baseRevision === null || Number.isInteger(record.baseRevision)) ||
    !isStorageObject(record.payload) ||
    typeof record.payloadHash !== "string" ||
    !STATUSES.includes(record.status as (typeof STATUSES)[number])
  ) {
    return { ok: false, error: invalidStorageRecord("sync operation", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as SyncQueueRecord;
  return { ok: true, value: entity };
}

export function mapSyncOperationEntityToRecord(entity: SyncOperation): SyncQueueRecord {
  return { ...entity, schemaVersion: SYNC_OPERATION_MAPPER_VERSION };
}
