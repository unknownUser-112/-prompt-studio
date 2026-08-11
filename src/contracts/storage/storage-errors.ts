import type { AppError } from "../core/errors";
import type { StorageRecordMetadata, StorageValue } from "./records/project";
import type { StoreName } from "./store-names";

export type StorageErrorCode =
  | "storage/invalid-record"
  | "storage/not-found"
  | "storage/conflict"
  | "storage/constraint"
  | "storage/transaction-aborted"
  | "storage/quota-exceeded"
  | "storage/unavailable"
  | "storage/unknown";

export interface StorageError extends AppError {
  readonly code: StorageErrorCode;
  readonly store?: StoreName;
}

export function invalidStorageRecord(recordType: string, reason: string): StorageError {
  return {
    code: "storage/invalid-record",
    moduleId: "storage",
    severity: "error",
    userMessage: "The stored data is invalid.",
    technicalMessage: `Invalid ${recordType} record: ${reason}`,
    recoverable: false,
  };
}

export function isStorageRecordMetadata(
  value: unknown,
): value is StorageRecordMetadata & Readonly<Record<string, unknown>> {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.schemaVersion === 1 &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Number.isInteger(value.revision) &&
    (value.revision as number) >= 0
  );
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function isStorageValue(value: unknown): value is StorageValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isStorageValue);
  return isRecord(value) && Object.values(value).every(isStorageValue);
}

export function isStorageObject(value: unknown): value is Readonly<Record<string, StorageValue>> {
  return isRecord(value) && Object.values(value).every(isStorageValue);
}
