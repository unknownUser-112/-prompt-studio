import type { Result } from "../../contracts/core/result";
import type { SettingsRecord } from "../../contracts/storage/records/settings";
import {
  invalidStorageRecord,
  isNullableString,
  isRecord,
  isStorageRecordMetadata,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { Settings } from "../../domain/entities/settings";

export const SETTINGS_MAPPER_VERSION = 1 as const;
const FLAG_NAMES = [
  "characterLibrary",
  "outfitLibrary",
  "sceneLibrary",
  "promptLibrary",
  "imageLibrary",
  "revisionHistoryUi",
  "cloudSync",
  "aiKnowledgeBase",
] as const;

export function mapSettingsRecordToEntity(record: unknown): Result<Settings, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    typeof record.key !== "string" ||
    (record.scope !== "global" && record.scope !== "project") ||
    !isNullableString(record.projectId) ||
    !hasBooleanFlags(record.featureFlags) ||
    !isNullableString(record.activeProjectId) ||
    !isMigrationLedger(record.migrationLedger)
  ) {
    return { ok: false, error: invalidStorageRecord("settings", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as SettingsRecord;
  return { ok: true, value: entity };
}

export function mapSettingsEntityToRecord(entity: Settings): SettingsRecord {
  return { ...entity, schemaVersion: SETTINGS_MAPPER_VERSION };
}

function hasBooleanFlags(value: unknown): boolean {
  return (
    isRecord(value) &&
    FLAG_NAMES.every((name) => typeof value[name] === "boolean") &&
    value.cloudSync === false &&
    value.aiKnowledgeBase === false
  );
}

function isMigrationLedger(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) =>
    isRecord(entry) &&
    typeof entry.migrationId === "string" &&
    typeof entry.completedAt === "string" &&
    typeof entry.sourceVersion === "string"
  );
}
