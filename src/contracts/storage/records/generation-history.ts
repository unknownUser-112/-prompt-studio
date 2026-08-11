import type { StorageObject, StorageRecordMetadata } from "./project";

export interface GenerationHistoryRecord extends StorageRecordMetadata {
  readonly projectId: string;
  readonly profileId: string;
  readonly promptResult: StorageObject;
  readonly resolvedStateHash: string;
  readonly diagnosticSummary: StorageObject;
}
