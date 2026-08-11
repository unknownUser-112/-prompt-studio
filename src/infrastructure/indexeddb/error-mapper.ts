import type { StorageError, StorageErrorCode } from "../../contracts/storage/storage-errors";
import type { StoreName } from "../../contracts/storage/store-names";

const ERROR_CODES: Readonly<Record<string, StorageErrorCode>> = {
  AbortError: "storage/transaction-aborted",
  ConstraintError: "storage/constraint",
  InvalidStateError: "storage/unavailable",
  NotFoundError: "storage/unavailable",
  QuotaExceededError: "storage/quota-exceeded",
  ReadOnlyError: "storage/conflict",
  TransactionInactiveError: "storage/transaction-aborted",
  UnknownError: "storage/unknown",
  VersionError: "storage/unavailable",
};

export function mapIndexedDbError(error: unknown, store?: StoreName): StorageError {
  const name = errorName(error);
  const code = ERROR_CODES[name] ?? "storage/unknown";
  return createStorageError(code, store, `IndexedDB ${name}`);
}

export function createStorageError(
  code: StorageErrorCode,
  store?: StoreName,
  technicalMessage = `IndexedDB operation failed with ${code}`,
): StorageError {
  return {
    code,
    moduleId: "storage",
    severity: "error",
    userMessage: userMessage(code),
    technicalMessage,
    recoverable: code !== "storage/invalid-record",
    ...(store === undefined ? {} : { store }),
  };
}

function errorName(error: unknown): string {
  if (error !== null && typeof error === "object" && "name" in error) {
    const name = (error as { readonly name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) return name;
  }
  return "UnknownError";
}

function userMessage(code: StorageErrorCode): string {
  switch (code) {
    case "storage/quota-exceeded":
      return "There is not enough storage space to save the data.";
    case "storage/unavailable":
      return "Persistent storage is unavailable.";
    case "storage/constraint":
      return "The data conflicts with an existing record.";
    case "storage/transaction-aborted":
      return "The storage transaction could not be completed.";
    case "storage/invalid-record":
      return "The stored data is invalid.";
    default:
      return "The storage operation could not be completed.";
  }
}
