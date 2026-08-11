import type { DomainObject } from "./project";

export type ProjectRevisionReason =
  | "created"
  | "autosave"
  | "manual-save"
  | "import"
  | "migration";

export interface ProjectRevision {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly projectId: string;
  readonly sequence: number;
  readonly reason: ProjectRevisionReason;
  readonly parentRevisionId: string | null;
  readonly snapshot: DomainObject;
  readonly sha256: string;
}
