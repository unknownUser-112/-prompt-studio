import type { Result } from "../../contracts/core/result";
import type { StorageError } from "../../contracts/storage/storage-errors";
import type { StoreName } from "../../contracts/storage/store-names";
import type { StorageTransaction } from "../../contracts/storage/transaction";
import { STORAGE_SCHEMA_V1, type StorageSchemaDefinition } from "./schema-v1";
import { createStorageError, mapIndexedDbError } from "./error-mapper";
import {
  deleteIndexedDbValue,
  getAllIndexedDbValues,
  getAllIndexedDbValuesByIndex,
  getIndexedDbValue,
  putIndexedDbValue,
} from "./transaction-runner";

export interface IndexedDbAdapterOptions {
  readonly factory?: IDBFactory;
  readonly databaseName?: string;
  readonly version?: number;
  readonly schema?: StorageSchemaDefinition;
}

export class IndexedDbAdapter {
  private readonly factory: IDBFactory | undefined;
  private readonly databaseName: string;
  private readonly version: number;
  private readonly schema: StorageSchemaDefinition;
  private database: IDBDatabase | null = null;
  private opening: Promise<Result<IDBDatabase, StorageError>> | null = null;

  public constructor(options: IndexedDbAdapterOptions = {}) {
    this.factory = options.factory ?? globalThis.indexedDB;
    this.schema = options.schema ?? STORAGE_SCHEMA_V1;
    this.databaseName = options.databaseName ?? this.schema.databaseName;
    this.version = options.version ?? this.schema.version;
  }

  public async open(): Promise<Result<IDBDatabase, StorageError>> {
    if (this.database !== null) return { ok: true, value: this.database };
    if (this.factory === undefined) {
      return { ok: false, error: createStorageError("storage/unavailable", undefined, "IndexedDB factory is unavailable") };
    }
    if (this.opening !== null) return this.opening;

    this.opening = this.openDatabase();
    const result = await this.opening;
    this.opening = null;
    return result;
  }

  public close(): void {
    this.database?.close();
    this.database = null;
  }

  private async openDatabase(): Promise<Result<IDBDatabase, StorageError>> {
    let request: IDBOpenDBRequest;
    try {
      request = this.factory!.open(this.databaseName, this.version);
    } catch (error) {
      return { ok: false, error: mapIndexedDbError(error) };
    }

    return new Promise((resolve) => {
      request.onupgradeneeded = () => {
        try {
          installSchema(request.result, request.transaction, this.schema);
        } catch (error) {
          request.transaction?.abort();
          resolve({ ok: false, error: mapIndexedDbError(error) });
        }
      };
      request.onerror = () => resolve({ ok: false, error: mapIndexedDbError(request.error) });
      request.onblocked = () => resolve({
        ok: false,
        error: createStorageError("storage/unavailable", undefined, `IndexedDB open blocked for ${this.databaseName}`),
      });
      request.onsuccess = () => {
        const database = request.result;
        this.database = database;
        database.onclose = () => {
          if (this.database === database) this.database = null;
        };
        database.onversionchange = () => {
          database.close();
          if (this.database === database) this.database = null;
        };
        resolve({ ok: true, value: database });
      };
    });
  }
}

export type IndexedDbRecordValidator<T> = (value: unknown) => value is T;

export class IndexedDbRecordStore<T> {
  public constructor(
    private readonly adapter: IndexedDbAdapter,
    private readonly store: StoreName,
    private readonly recordType: string,
    private readonly validate: IndexedDbRecordValidator<T>,
  ) {}

  public async get(key: IDBValidKey, transaction?: StorageTransaction): Promise<Result<T | null, StorageError>> {
    const result = await getIndexedDbValue(this.adapter, this.store, key, transaction);
    if (!result.ok) return result;
    if (result.value === null) return { ok: true, value: null };
    return this.validated(result.value);
  }

  public async list(transaction?: StorageTransaction): Promise<Result<readonly T[], StorageError>> {
    const result = await getAllIndexedDbValues(this.adapter, this.store, transaction);
    if (!result.ok) return result;
    return this.validatedList(result.value);
  }

  public async listByIndex(
    index: string,
    key: IDBValidKey,
    transaction?: StorageTransaction,
  ): Promise<Result<readonly T[], StorageError>> {
    const result = await getAllIndexedDbValuesByIndex(this.adapter, this.store, index, key, transaction);
    if (!result.ok) return result;
    return this.validatedList(result.value);
  }

  public async firstByIndex(
    index: string,
    key: IDBValidKey,
    transaction?: StorageTransaction,
  ): Promise<Result<T | null, StorageError>> {
    const result = await this.listByIndex(index, key, transaction);
    if (!result.ok) return result;
    return { ok: true, value: result.value[0] ?? null };
  }

  public async put(record: T, transaction?: StorageTransaction): Promise<Result<void, StorageError>> {
    if (!this.validate(record)) return { ok: false, error: this.invalidRecordError() };
    return putIndexedDbValue(this.adapter, this.store, record, transaction);
  }

  public delete(key: IDBValidKey, transaction?: StorageTransaction): Promise<Result<void, StorageError>> {
    return deleteIndexedDbValue(this.adapter, this.store, key, transaction);
  }

  private validated(value: unknown): Result<T, StorageError> {
    return this.validate(value)
      ? { ok: true, value }
      : { ok: false, error: this.invalidRecordError() };
  }

  private validatedList(values: readonly unknown[]): Result<readonly T[], StorageError> {
    const records: T[] = [];
    for (const value of values) {
      if (!this.validate(value)) return { ok: false, error: this.invalidRecordError() };
      records.push(value);
    }
    return { ok: true, value: records };
  }

  private invalidRecordError(): StorageError {
    return createStorageError(
      "storage/invalid-record",
      this.store,
      `Invalid ${this.recordType} persistence record`,
    );
  }
}

function installSchema(
  database: IDBDatabase,
  transaction: IDBTransaction | null,
  schema: StorageSchemaDefinition,
): void {
  for (const definition of schema.stores) {
    const objectStore = database.objectStoreNames.contains(definition.name)
      ? transaction?.objectStore(definition.name)
      : database.createObjectStore(definition.name, { keyPath: definition.keyPath });
    if (objectStore === undefined) {
      throw new Error(`IndexedDB upgrade transaction is missing for ${definition.name}`);
    }
    for (const index of definition.indexes) {
      if (!objectStore.indexNames.contains(index.name)) {
        objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      }
    }
  }
}
