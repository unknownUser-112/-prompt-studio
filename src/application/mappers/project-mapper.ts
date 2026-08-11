import type { Result } from "../../contracts/core/result";
import type { ProjectRecord } from "../../contracts/storage/records/project";
import {
  invalidStorageRecord,
  isNullableString,
  isStorageObject,
  isStorageRecordMetadata,
  isStringArray,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { Project } from "../../domain/entities/project";

export const PROJECT_MAPPER_VERSION = 1 as const;

export function mapProjectRecordToEntity(record: unknown): Result<Project, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    typeof record.name !== "string" ||
    !isStorageObject(record.state) ||
    !isNullableString(record.currentRevisionId) ||
    !isNullableString(record.autosavedAt) ||
    (record.lifecycleStatus !== "active" && record.lifecycleStatus !== "archived") ||
    !isStringArray(record.tagIds)
  ) {
    return { ok: false, error: invalidStorageRecord("project", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as ProjectRecord;
  return { ok: true, value: entity };
}

export function mapProjectEntityToRecord(entity: Project): ProjectRecord {
  return { ...entity, schemaVersion: PROJECT_MAPPER_VERSION };
}
