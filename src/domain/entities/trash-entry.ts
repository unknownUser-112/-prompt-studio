import type { DomainObject } from "./project";

export type OriginalStoreName =
  | "Projects"
  | "ProjectRevisions"
  | "Profiles"
  | "Characters"
  | "Outfits"
  | "Scenes"
  | "PromptTemplates"
  | "GenerationHistory"
  | "ImageAssets"
  | "Tags"
  | "Settings"
  | "Trash"
  | "SyncQueue";

export interface TrashEntry {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly originalStore: OriginalStoreName;
  readonly entityType: string;
  readonly originalId: string;
  readonly payload: DomainObject;
  readonly deletedAt: string;
  readonly restoreMetadata: DomainObject;
}
