import type { Result } from "../../contracts/core/result";
import type { GenerationHistoryRecord } from "../../contracts/storage/records/generation-history";
import {
  invalidStorageRecord,
  isStorageObject,
  isStorageRecordMetadata,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { GenerationHistoryEntry } from "../../domain/entities/generation-history";

export const GENERATION_HISTORY_MAPPER_VERSION = 1 as const;

export function mapGenerationHistoryRecordToEntity(record: unknown): Result<GenerationHistoryEntry, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    typeof record.projectId !== "string" ||
    typeof record.profileId !== "string" ||
    !isStorageObject(record.promptResult) ||
    typeof record.resolvedStateHash !== "string" ||
    !isStorageObject(record.diagnosticSummary)
  ) {
    return { ok: false, error: invalidStorageRecord("generation history", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as GenerationHistoryRecord;
  return { ok: true, value: entity };
}

export function mapGenerationHistoryEntityToRecord(entity: GenerationHistoryEntry): GenerationHistoryRecord {
  return { ...entity, schemaVersion: GENERATION_HISTORY_MAPPER_VERSION };
}
