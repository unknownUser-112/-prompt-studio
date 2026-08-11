import type { Result } from "../../contracts/core/result";
import type { TrashRecord } from "../../contracts/storage/records/trash";
import {
  invalidStorageRecord,
  isStorageObject,
  isStorageRecordMetadata,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import { STORE_NAMES, type StoreName } from "../../contracts/storage/store-names";
import type { TrashEntry } from "../../domain/entities/trash-entry";

export const TRASH_MAPPER_VERSION = 1 as const;

export function mapTrashEntryRecordToEntity(record: unknown): Result<TrashEntry, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    !STORE_NAMES.includes(record.originalStore as StoreName) ||
    typeof record.entityType !== "string" ||
    typeof record.originalId !== "string" ||
    !isStorageObject(record.payload) ||
    typeof record.deletedAt !== "string" ||
    !isStorageObject(record.restoreMetadata)
  ) {
    return { ok: false, error: invalidStorageRecord("trash", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as TrashRecord;
  return { ok: true, value: entity };
}

export function mapTrashEntryEntityToRecord(entity: TrashEntry): TrashRecord {
  return { ...entity, schemaVersion: TRASH_MAPPER_VERSION };
}
