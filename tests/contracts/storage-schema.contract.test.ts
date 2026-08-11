import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { STORE_NAMES } from "../../src/contracts/storage/store-names";
import { STORAGE_SCHEMA_V1 } from "../../src/infrastructure/indexeddb/schema-v1";

const EXPECTED_STORES = [
  { name: "Projects", keyPath: "id", indexes: [["updatedAt", "updatedAt", false], ["name", "name", false], ["lifecycleStatus", "lifecycleStatus", false]] },
  { name: "ProjectRevisions", keyPath: "id", indexes: [["projectId", "projectId", false], ["projectIdSequence", ["projectId", "sequence"], false], ["createdAt", "createdAt", false]] },
  { name: "Profiles", keyPath: "id", indexes: [["kind", "kind", false], ["name", "name", false], ["updatedAt", "updatedAt", false]] },
  { name: "Characters", keyPath: "id", indexes: [["name", "name", false], ["updatedAt", "updatedAt", false], ["sourceProjectId", "sourceProjectId", false]] },
  { name: "Outfits", keyPath: "id", indexes: [["name", "name", false], ["updatedAt", "updatedAt", false], ["sourceProjectId", "sourceProjectId", false]] },
  { name: "Scenes", keyPath: "id", indexes: [["name", "name", false], ["updatedAt", "updatedAt", false], ["sourceProjectId", "sourceProjectId", false]] },
  { name: "PromptTemplates", keyPath: "id", indexes: [["name", "name", false], ["updatedAt", "updatedAt", false], ["sourceProjectId", "sourceProjectId", false]] },
  { name: "GenerationHistory", keyPath: "id", indexes: [["projectId", "projectId", false], ["profileId", "profileId", false], ["createdAt", "createdAt", false]] },
  { name: "ImageAssets", keyPath: "id", indexes: [["sha256", "sha256", false], ["createdAt", "createdAt", false]] },
  { name: "Tags", keyPath: "id", indexes: [["slug", "slug", true], ["name", "name", false]] },
  { name: "Settings", keyPath: "key", indexes: [["scope", "scope", false], ["projectId", "projectId", false]] },
  { name: "Trash", keyPath: "id", indexes: [["entityType", "entityType", false], ["deletedAt", "deletedAt", false], ["originalId", "originalId", false]] },
  { name: "SyncQueue", keyPath: "id", indexes: [["status", "status", false], ["createdAt", "createdAt", false], ["entity", ["entityType", "entityId"], false]] },
] as const;

describe("storage schema v1", () => {
  it("declares the exact database, stores, key paths, and indexes", () => {
    expect(STORAGE_SCHEMA_V1.databaseName).toBe("prompt-studio-v600");
    expect(STORAGE_SCHEMA_V1.version).toBe(1);
    expect(STORE_NAMES).toEqual(EXPECTED_STORES.map(({ name }) => name));
    expect(STORAGE_SCHEMA_V1.stores).toEqual(
      EXPECTED_STORES.map(({ name, keyPath, indexes }) => ({
        name,
        keyPath,
        indexes: indexes.map(([indexName, indexKeyPath, unique]) => ({
          name: indexName,
          keyPath: indexKeyPath,
          unique,
        })),
      })),
    );
  });

  it("keeps the declarative infrastructure schema independent of domain entities", async () => {
    const source = await readFile("src/infrastructure/indexeddb/schema-v1.ts", "utf8");

    expect(source).not.toMatch(/from\s+["'][^"']*domain\//u);
    expect(source).not.toMatch(/\bIDB(?:Database|ObjectStore|Index|Transaction)\b/u);
  });
});
