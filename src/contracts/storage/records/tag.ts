import type { StorageRecordMetadata } from "./project";

export interface TagRecord extends StorageRecordMetadata {
  readonly slug: string;
  readonly name: string;
  readonly color: string | null;
}
