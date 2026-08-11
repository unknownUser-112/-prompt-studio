import type { Result } from "../../contracts/core/result";
import type { ProfileRecord } from "../../contracts/storage/records/profile";
import {
  invalidStorageRecord,
  isStorageObject,
  isStorageRecordMetadata,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { Profile } from "../../domain/entities/profile";

export const PROFILE_MAPPER_VERSION = 1 as const;

export function mapProfileRecordToEntity(record: unknown): Result<Profile, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    (record.kind !== "built-in" && record.kind !== "custom") ||
    typeof record.name !== "string" ||
    typeof record.strategyId !== "string" ||
    typeof record.strategyVersion !== "string" ||
    !isStorageObject(record.configuration)
  ) {
    return { ok: false, error: invalidStorageRecord("profile", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as ProfileRecord;
  return { ok: true, value: entity };
}

export function mapProfileEntityToRecord(entity: Profile): ProfileRecord {
  return { ...entity, schemaVersion: PROFILE_MAPPER_VERSION };
}
