import type { StoreName } from "../../contracts/storage/store-names";

export interface StorageIndexDefinition {
  readonly name: string;
  readonly keyPath: string | readonly string[];
  readonly unique: boolean;
}

export interface StorageStoreDefinition {
  readonly name: StoreName;
  readonly keyPath: string;
  readonly indexes: readonly StorageIndexDefinition[];
}

export interface StorageSchemaDefinition {
  readonly databaseName: string;
  readonly version: number;
  readonly stores: readonly StorageStoreDefinition[];
}

const indexes = (...definitions: readonly (readonly [string, string | readonly string[], boolean])[]): readonly StorageIndexDefinition[] =>
  definitions.map(([name, keyPath, unique]) => ({ name, keyPath, unique }));

export const STORAGE_SCHEMA_V1: StorageSchemaDefinition = {
  databaseName: "prompt-studio-v600",
  version: 1,
  stores: [
    { name: "Projects", keyPath: "id", indexes: indexes(["updatedAt", "updatedAt", false], ["name", "name", false], ["lifecycleStatus", "lifecycleStatus", false]) },
    { name: "ProjectRevisions", keyPath: "id", indexes: indexes(["projectId", "projectId", false], ["projectIdSequence", ["projectId", "sequence"], false], ["createdAt", "createdAt", false]) },
    { name: "Profiles", keyPath: "id", indexes: indexes(["kind", "kind", false], ["name", "name", false], ["updatedAt", "updatedAt", false]) },
    { name: "Characters", keyPath: "id", indexes: indexes(["name", "name", false], ["updatedAt", "updatedAt", false], ["sourceProjectId", "sourceProjectId", false]) },
    { name: "Outfits", keyPath: "id", indexes: indexes(["name", "name", false], ["updatedAt", "updatedAt", false], ["sourceProjectId", "sourceProjectId", false]) },
    { name: "Scenes", keyPath: "id", indexes: indexes(["name", "name", false], ["updatedAt", "updatedAt", false], ["sourceProjectId", "sourceProjectId", false]) },
    { name: "PromptTemplates", keyPath: "id", indexes: indexes(["name", "name", false], ["updatedAt", "updatedAt", false], ["sourceProjectId", "sourceProjectId", false]) },
    { name: "GenerationHistory", keyPath: "id", indexes: indexes(["projectId", "projectId", false], ["profileId", "profileId", false], ["createdAt", "createdAt", false]) },
    { name: "ImageAssets", keyPath: "id", indexes: indexes(["sha256", "sha256", false], ["createdAt", "createdAt", false]) },
    { name: "Tags", keyPath: "id", indexes: indexes(["slug", "slug", true], ["name", "name", false]) },
    { name: "Settings", keyPath: "key", indexes: indexes(["scope", "scope", false], ["projectId", "projectId", false]) },
    { name: "Trash", keyPath: "id", indexes: indexes(["entityType", "entityType", false], ["deletedAt", "deletedAt", false], ["originalId", "originalId", false]) },
    { name: "SyncQueue", keyPath: "id", indexes: indexes(["status", "status", false], ["createdAt", "createdAt", false], ["entity", ["entityType", "entityId"], false]) },
  ],
};
