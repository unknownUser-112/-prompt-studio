import type { DomainObject } from "./project";

interface LibraryEntity {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly name: string;
  readonly payload: DomainObject;
  readonly tagIds: readonly string[];
  readonly sourceProjectId: string | null;
}

export interface Character extends LibraryEntity {}
export interface Outfit extends LibraryEntity {}
export interface Scene extends LibraryEntity {}
export interface PromptTemplate extends LibraryEntity {}
