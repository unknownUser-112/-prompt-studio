import type { StorageObject, StorageRecordMetadata } from "./project";

interface LibraryRecord extends StorageRecordMetadata {
  readonly name: string;
  readonly payload: StorageObject;
  readonly tagIds: readonly string[];
  readonly sourceProjectId: string | null;
}

export interface CharacterRecord extends LibraryRecord {}
export interface OutfitRecord extends LibraryRecord {}
export interface SceneRecord extends LibraryRecord {}
export interface PromptTemplateRecord extends LibraryRecord {}
