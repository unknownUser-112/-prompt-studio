import type { Result } from "../../contracts/core/result";
import type { StorageError } from "../../contracts/storage/storage-errors";
import type { StoreName } from "../../contracts/storage/store-names";
import type {
  StorageTransaction,
  StorageTransactionCoordinator,
  StorageTransactionMode,
  StorageTransactionOptions,
  StorageTransactionState,
} from "../../contracts/storage/transaction";
import type { IndexedDbAdapter } from "./indexeddb-adapter";
import { createStorageError, mapIndexedDbError } from "./error-mapper";

export class IndexedDbTransactionRunner implements StorageTransactionCoordinator {
  public constructor(private readonly adapter: IndexedDbAdapter) {}

  public async run<T>(
    options: StorageTransactionOptions,
    operation: (transaction: StorageTransaction) => Promise<Result<T, StorageError>>,
  ): Promise<Result<T, StorageError>> {
    const keepAliveStore = options.stores[0];
    if (keepAliveStore === undefined) {
      return { ok: false, error: createStorageError("storage/unavailable", undefined, "IndexedDB transaction requires at least one store") };
    }

    const databaseResult = await this.adapter.open();
    if (!databaseResult.ok) return databaseResult;

    let nativeTransaction: IDBTransaction;
    try {
      nativeTransaction = databaseResult.value.transaction([...new Set(options.stores)], options.mode);
    } catch (error) {
      return { ok: false, error: mapIndexedDbError(error) };
    }

    const transaction = new IndexedDbStorageTransaction(nativeTransaction, options.stores, options.mode);
    let operationPromise: Promise<Result<T, StorageError>>;
    try {
      operationPromise = operation(transaction);
    } catch (error) {
      await transaction.rollback();
      return { ok: false, error: mapIndexedDbError(error) };
    }
    const stopKeepAlive = keepTransactionActive(nativeTransaction, keepAliveStore);
    let operationResult: Result<T, StorageError>;
    try {
      operationResult = await operationPromise;
    } catch (error) {
      stopKeepAlive();
      await transaction.rollback();
      return { ok: false, error: mapIndexedDbError(error) };
    }
    stopKeepAlive();

    if (!operationResult.ok) {
      await transaction.rollback();
      return operationResult;
    }

    const commitResult = await transaction.commit();
    return commitResult.ok ? operationResult : commitResult;
  }
}

function keepTransactionActive(transaction: IDBTransaction, store: StoreName): () => void {
  let stopped = false;

  const issueRequest = (): void => {
    if (stopped) return;
    let request: IDBRequest;
    try {
      request = transaction.objectStore(store).get("__prompt_studio_transaction_keepalive__");
    } catch {
      return;
    }
    request.onsuccess = issueRequest;
    request.onerror = () => undefined;
  };

  issueRequest();
  return () => {
    stopped = true;
  };
}

export class IndexedDbStorageTransaction implements StorageTransaction {
  private currentState: StorageTransactionState = "active";
  private rollbackRequested = false;
  private readonly completion: Promise<Result<void, StorageError>>;

  public constructor(
    private readonly nativeTransaction: IDBTransaction,
    public readonly stores: readonly StoreName[],
    public readonly mode: StorageTransactionMode,
  ) {
    this.completion = new Promise((resolve) => {
      nativeTransaction.oncomplete = () => {
        this.currentState = "committed";
        resolve({ ok: true, value: undefined });
      };
      nativeTransaction.onabort = () => {
        this.currentState = "rolled-back";
        if (this.rollbackRequested) {
          resolve({ ok: true, value: undefined });
          return;
        }
        resolve({
          ok: false,
          error: mapIndexedDbError(nativeTransaction.error ?? namedAbortError()),
        });
      };
      nativeTransaction.onerror = () => undefined;
    });
  }

  public get state(): StorageTransactionState {
    return this.currentState;
  }

  public objectStore(store: StoreName, requiredMode: StorageTransactionMode): Result<IDBObjectStore, StorageError> {
    if (!this.stores.includes(store)) {
      return {
        ok: false,
        error: createStorageError("storage/unavailable", store, `Store ${store} is not part of the active transaction`),
      };
    }
    if (requiredMode === "readwrite" && this.mode !== "readwrite") {
      return {
        ok: false,
        error: createStorageError("storage/conflict", store, `Store ${store} is read-only in the active transaction`),
      };
    }
    if (this.currentState !== "active") {
      return {
        ok: false,
        error: createStorageError("storage/transaction-aborted", store, "IndexedDB transaction is no longer active"),
      };
    }
    try {
      return { ok: true, value: this.nativeTransaction.objectStore(store) };
    } catch (error) {
      return { ok: false, error: mapIndexedDbError(error, store) };
    }
  }

  public async commit(): Promise<Result<void, StorageError>> {
    if (this.currentState === "committed") return { ok: true, value: undefined };
    if (this.currentState === "rolled-back") {
      return { ok: false, error: createStorageError("storage/transaction-aborted") };
    }
    try {
      this.nativeTransaction.commit();
    } catch (error) {
      if (this.currentState === "active") return { ok: false, error: mapIndexedDbError(error) };
    }
    return this.completion;
  }

  public async rollback(): Promise<Result<void, StorageError>> {
    if (this.currentState === "rolled-back") return { ok: true, value: undefined };
    if (this.currentState === "committed") {
      return { ok: false, error: createStorageError("storage/transaction-aborted", undefined, "IndexedDB transaction already committed") };
    }
    this.rollbackRequested = true;
    try {
      this.nativeTransaction.abort();
    } catch (error) {
      if (this.currentState === "active") return { ok: false, error: mapIndexedDbError(error) };
    }
    return this.completion;
  }
}

export async function getIndexedDbValue(
  adapter: IndexedDbAdapter,
  store: StoreName,
  key: IDBValidKey,
  transaction?: StorageTransaction,
): Promise<Result<unknown | null, StorageError>> {
  return runRequest(adapter, store, "readonly", transaction, (objectStore) => objectStore.get(key), (value) => value ?? null);
}

export async function getAllIndexedDbValues(
  adapter: IndexedDbAdapter,
  store: StoreName,
  transaction?: StorageTransaction,
): Promise<Result<readonly unknown[], StorageError>> {
  return runRequest(adapter, store, "readonly", transaction, (objectStore) => objectStore.getAll(), (value) => value);
}

export async function getAllIndexedDbValuesByIndex(
  adapter: IndexedDbAdapter,
  store: StoreName,
  index: string,
  key: IDBValidKey,
  transaction?: StorageTransaction,
): Promise<Result<readonly unknown[], StorageError>> {
  return runRequest(
    adapter,
    store,
    "readonly",
    transaction,
    (objectStore) => objectStore.index(index).getAll(key),
    (value) => value,
  );
}

export async function putIndexedDbValue(
  adapter: IndexedDbAdapter,
  store: StoreName,
  value: unknown,
  transaction?: StorageTransaction,
): Promise<Result<void, StorageError>> {
  return runRequest(adapter, store, "readwrite", transaction, (objectStore) => objectStore.put(value), () => undefined);
}

export async function deleteIndexedDbValue(
  adapter: IndexedDbAdapter,
  store: StoreName,
  key: IDBValidKey,
  transaction?: StorageTransaction,
): Promise<Result<void, StorageError>> {
  return runRequest(adapter, store, "readwrite", transaction, (objectStore) => objectStore.delete(key), () => undefined);
}

async function runRequest<TRequest, TValue>(
  adapter: IndexedDbAdapter,
  store: StoreName,
  mode: StorageTransactionMode,
  transaction: StorageTransaction | undefined,
  createRequest: (objectStore: IDBObjectStore) => IDBRequest<TRequest>,
  mapValue: (value: TRequest) => TValue,
): Promise<Result<TValue, StorageError>> {
  if (transaction !== undefined) {
    if (!(transaction instanceof IndexedDbStorageTransaction)) {
      return { ok: false, error: createStorageError("storage/unavailable", store, "Unsupported storage transaction") };
    }
    const objectStoreResult = transaction.objectStore(store, mode);
    if (!objectStoreResult.ok) return objectStoreResult;
    return requestResult(createRequest, objectStoreResult.value, store, mapValue);
  }

  const runner = new IndexedDbTransactionRunner(adapter);
  return runner.run({ stores: [store], mode }, async (activeTransaction) => {
    if (!(activeTransaction instanceof IndexedDbStorageTransaction)) {
      return { ok: false, error: createStorageError("storage/unavailable", store, "Unsupported storage transaction") };
    }
    const objectStoreResult = activeTransaction.objectStore(store, mode);
    if (!objectStoreResult.ok) return objectStoreResult;
    return requestResult(createRequest, objectStoreResult.value, store, mapValue);
  });
}

async function requestResult<TRequest, TValue>(
  createRequest: (objectStore: IDBObjectStore) => IDBRequest<TRequest>,
  objectStore: IDBObjectStore,
  store: StoreName,
  mapValue: (value: TRequest) => TValue,
): Promise<Result<TValue, StorageError>> {
  let request: IDBRequest<TRequest>;
  try {
    request = createRequest(objectStore);
  } catch (error) {
    return { ok: false, error: mapIndexedDbError(error, store) };
  }

  return new Promise((resolve) => {
    request.onsuccess = () => resolve({ ok: true, value: mapValue(request.result) });
    request.onerror = (event) => {
      event.preventDefault();
      event.stopPropagation();
      resolve({ ok: false, error: mapIndexedDbError(request.error, store) });
    };
  });
}

function namedAbortError(): Error {
  const error = new Error("IndexedDB transaction aborted");
  error.name = "AbortError";
  return error;
}
