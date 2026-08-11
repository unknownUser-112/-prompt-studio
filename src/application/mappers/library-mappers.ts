import type { Result } from "../../contracts/core/result";
import type {
  CharacterRecord,
  OutfitRecord,
  PromptTemplateRecord,
  SceneRecord,
} from "../../contracts/storage/records/library-records";
import {
  invalidStorageRecord,
  isNullableString,
  isStorageObject,
  isStorageRecordMetadata,
  isStringArray,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { Character, Outfit, PromptTemplate, Scene } from "../../domain/entities/libraries";

export const LIBRARY_MAPPER_VERSION = 1 as const;

export function mapCharacterRecordToEntity(record: unknown): Result<Character, StorageError> {
  return mapLibraryRecord(record, "character");
}

export function mapOutfitRecordToEntity(record: unknown): Result<Outfit, StorageError> {
  return mapLibraryRecord(record, "outfit");
}

export function mapSceneRecordToEntity(record: unknown): Result<Scene, StorageError> {
  return mapLibraryRecord(record, "scene");
}

export function mapPromptTemplateRecordToEntity(record: unknown): Result<PromptTemplate, StorageError> {
  return mapLibraryRecord(record, "prompt template");
}

export function mapCharacterEntityToRecord(entity: Character): CharacterRecord {
  return { ...entity, schemaVersion: LIBRARY_MAPPER_VERSION };
}

export function mapOutfitEntityToRecord(entity: Outfit): OutfitRecord {
  return { ...entity, schemaVersion: LIBRARY_MAPPER_VERSION };
}

export function mapSceneEntityToRecord(entity: Scene): SceneRecord {
  return { ...entity, schemaVersion: LIBRARY_MAPPER_VERSION };
}

export function mapPromptTemplateEntityToRecord(entity: PromptTemplate): PromptTemplateRecord {
  return { ...entity, schemaVersion: LIBRARY_MAPPER_VERSION };
}

function mapLibraryRecord(record: unknown, recordType: string): Result<Character, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    typeof record.name !== "string" ||
    !isStorageObject(record.payload) ||
    !isStringArray(record.tagIds) ||
    !isNullableString(record.sourceProjectId)
  ) {
    return { ok: false, error: invalidStorageRecord(recordType, "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as CharacterRecord;
  return { ok: true, value: entity };
}
