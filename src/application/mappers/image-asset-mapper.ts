import type { Result } from "../../contracts/core/result";
import type { ImageAssetRecord } from "../../contracts/storage/records/image-asset";
import {
  invalidStorageRecord,
  isStorageRecordMetadata,
  isStringArray,
  type StorageError,
} from "../../contracts/storage/storage-errors";
import type { ImageAsset } from "../../domain/entities/image-asset";

export const IMAGE_ASSET_MAPPER_VERSION = 1 as const;

export function mapImageAssetRecordToEntity(record: unknown): Result<ImageAsset, StorageError> {
  if (
    !isStorageRecordMetadata(record) ||
    !isBlobValue(record.blob) ||
    typeof record.mimeType !== "string" ||
    !Number.isFinite(record.width) ||
    !Number.isFinite(record.height) ||
    typeof record.sha256 !== "string" ||
    !isStringArray(record.referencedEntityIds)
  ) {
    return { ok: false, error: invalidStorageRecord("image asset", "shape or schema version") };
  }

  const { schemaVersion: _schemaVersion, ...entity } = record as unknown as ImageAssetRecord;
  return { ok: true, value: entity };
}

export function mapImageAssetEntityToRecord(entity: ImageAsset): ImageAssetRecord {
  return { ...entity, schemaVersion: IMAGE_ASSET_MAPPER_VERSION };
}

function isBlobValue(value: unknown): value is Blob {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<Blob>;
  return (
    typeof candidate.size === "number" &&
    typeof candidate.type === "string" &&
    typeof candidate.arrayBuffer === "function" &&
    typeof candidate.slice === "function" &&
    typeof candidate.stream === "function" &&
    typeof candidate.text === "function"
  );
}
