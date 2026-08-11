export const STORAGE_RECORD_SCHEMA_VERSION = 1 as const;

export interface StorageRecordMetadata {
  readonly id: string;
  readonly schemaVersion: typeof STORAGE_RECORD_SCHEMA_VERSION;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
}

export type StorageValue =
  | null
  | string
  | number
  | boolean
  | readonly StorageValue[]
  | { readonly [key: string]: StorageValue };

export type StorageObject = Readonly<Record<string, StorageValue>>;

export type ProjectLifecycleStatus = "active" | "archived";

export interface ProjectRecord extends StorageRecordMetadata {
  readonly name: string;
  readonly state: StorageObject;
  readonly currentRevisionId: string | null;
  readonly autosavedAt: string | null;
  readonly lifecycleStatus: ProjectLifecycleStatus;
  readonly tagIds: readonly string[];
}
