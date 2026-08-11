import type { StorageObject, StorageRecordMetadata } from "./project";

export type ProfileRecordKind = "built-in" | "custom";

export interface ProfileRecord extends StorageRecordMetadata {
  readonly kind: ProfileRecordKind;
  readonly name: string;
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly configuration: StorageObject;
}
