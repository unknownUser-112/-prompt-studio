import type { Result } from "../../contracts/core/result";
import type { TagRecord } from "../../contracts/storage/records/tag";
import {
  invalidStorageRecord,
  isNullableString,
  isStorageRecordMetadata,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { Tag } from "../../domain/entities/tag";

export const TAG_MAPPER_VERSION = 1 as const;

export function mapTagRecordToEntity(record: unknown): Result<Tag, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    typeof record.slug !== "string" ||
    typeof record.name !== "string" ||
    !isNullableString(record.color)
  ) {
    return { ok: false, error: invalidStorageRecord("tag", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as TagRecord;
  return { ok: true, value: entity };
}

export function mapTagEntityToRecord(entity: Tag): TagRecord {
  return { ...entity, schemaVersion: TAG_MAPPER_VERSION };
}
