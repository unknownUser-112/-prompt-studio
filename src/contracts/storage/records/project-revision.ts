import type { StorageObject, StorageRecordMetadata } from "./project";

export type ProjectRevisionReason =
  | "created"
  | "autosave"
  | "manual-save"
  | "import"
  | "migration"
  | "duplicate"
  | "restore"
  | "milestone";

export interface ProjectRevisionRecord extends StorageRecordMetadata {
  readonly projectId: string;
  readonly sequence: number;
  readonly reason: ProjectRevisionReason;
  readonly parentRevisionId: string | null;
  readonly snapshot: StorageObject;
  readonly sha256: string;
}
