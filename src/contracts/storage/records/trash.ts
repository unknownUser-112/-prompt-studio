import type { StorageObject, StorageRecordMetadata } from "./project";
import type { StoreName } from "../store-names";

export interface TrashRecord extends StorageRecordMetadata {
  readonly originalStore: StoreName;
  readonly entityType: string;
  readonly originalId: string;
  readonly payload: StorageObject;
  readonly deletedAt: string;
  readonly restoreMetadata: StorageObject;
}
