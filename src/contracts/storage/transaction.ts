import type { Result } from "../core/result";
import type { StorageError } from "./storage-errors";
import type { StoreName } from "./store-names";

export type StorageTransactionMode = "readonly" | "readwrite";
export type StorageTransactionState = "active" | "committed" | "rolled-back";

export interface StorageTransaction {
  readonly stores: readonly StoreName[];
  readonly mode: StorageTransactionMode;
  readonly state: StorageTransactionState;
  commit(): Promise<Result<void, StorageError>>;
  rollback(): Promise<Result<void, StorageError>>;
}

export interface StorageTransactionOptions {
  readonly stores: readonly StoreName[];
  readonly mode: StorageTransactionMode;
}

export interface StorageTransactionCoordinator {
  run<T>(
    options: StorageTransactionOptions,
    operation: (transaction: StorageTransaction) => Promise<Result<T, StorageError>>,
  ): Promise<Result<T, StorageError>>;
}
