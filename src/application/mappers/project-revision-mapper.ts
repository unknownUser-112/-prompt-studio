import type { Result } from "../../contracts/core/result";
import type { ProjectRevisionRecord } from "../../contracts/storage/records/project-revision";
import {
  invalidStorageRecord,
  isNullableString,
  isStorageObject,
  isStorageRecordMetadata,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { ProjectRevision } from "../../domain/entities/project-revision";

export const PROJECT_REVISION_MAPPER_VERSION = 1 as const;
const REASONS = ["created", "autosave", "manual-save", "import", "migration"] as const;

export function mapProjectRevisionRecordToEntity(record: unknown): Result<ProjectRevision, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    typeof record.projectId !== "string" ||
    !Number.isInteger(record.sequence) ||
    !REASONS.includes(record.reason as (typeof REASONS)[number]) ||
    !isNullableString(record.parentRevisionId) ||
    !isStorageObject(record.snapshot) ||
    typeof record.sha256 !== "string"
  ) {
    return { ok: false, error: invalidStorageRecord("project revision", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as ProjectRevisionRecord;
  return { ok: true, value: entity };
}

export function mapProjectRevisionEntityToRecord(entity: ProjectRevision): ProjectRevisionRecord {
  return { ...entity, schemaVersion: PROJECT_REVISION_MAPPER_VERSION };
}
