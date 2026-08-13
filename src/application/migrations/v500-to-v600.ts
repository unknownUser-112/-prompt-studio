import type { AppError } from "../../contracts/core/errors";
import type { Result } from "../../contracts/core/result";
import type { StorageObject, StorageValue } from "../../contracts/storage/records/project";
import { isRecord } from "../../contracts/storage/storage-errors";

export const V500_MAX_BYTES = 2 * 1024 * 1024;

export interface V500ProjectSnapshot {
  readonly sourceVersion: string;
  readonly data: StorageObject;
}

export function parseV500Project(raw: string): Result<V500ProjectSnapshot, AppError> {
  if (new TextEncoder().encode(raw).byteLength > V500_MAX_BYTES) {
    return failure("MIGRATION_SOURCE_OVERSIZE", "V500 input exceeds the 2 MiB UTF-8 limit");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return failure("MIGRATION_INVALID_JSON", "V500 input is not valid JSON");
  }
  if (
    !isRecord(parsed) ||
    parsed.application !== "Prompt Studio" ||
    typeof parsed.version !== "string" ||
    !/^V500(?:\.|$)/u.test(parsed.version) ||
    !isStorageObjectValue(parsed.data)
  ) {
    return failure("MIGRATION_INVALID_SIGNATURE", "V500 application signature or project shape is invalid");
  }
  return {
    ok: true,
    value: {
      sourceVersion: parsed.version,
      data: cloneStorageObject(parsed.data),
    },
  };
}

export function migrateV500Project(snapshot: V500ProjectSnapshot): StorageObject {
  return cloneStorageObject(snapshot.data);
}

function isStorageObjectValue(value: unknown): value is StorageObject {
  return isRecord(value) && Object.values(value).every(isStorageValueValue);
}

function isStorageValueValue(value: unknown): value is StorageValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isStorageValueValue);
  return isStorageObjectValue(value);
}

function cloneStorageObject(value: StorageObject): StorageObject {
  return JSON.parse(JSON.stringify(value)) as StorageObject;
}

function failure(code: string, technicalMessage: string): Result<never, AppError> {
  return {
    ok: false,
    error: {
      code,
      moduleId: "migration",
      severity: "error",
      userMessage: "The project data could not be migrated.",
      technicalMessage,
      recoverable: true,
    },
  };
}
