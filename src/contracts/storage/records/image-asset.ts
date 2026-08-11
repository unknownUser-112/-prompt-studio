import type { StorageRecordMetadata } from "./project";

export interface ImageAssetRecord extends StorageRecordMetadata {
  readonly blob: Blob;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly referencedEntityIds: readonly string[];
}
