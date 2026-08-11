import { describe, expect, it } from "vitest";

import {
  mapGenerationHistoryEntityToRecord,
  mapGenerationHistoryRecordToEntity,
} from "../../../src/application/mappers/generation-history-mapper";
import {
  mapImageAssetEntityToRecord,
  mapImageAssetRecordToEntity,
} from "../../../src/application/mappers/image-asset-mapper";
import {
  mapCharacterEntityToRecord,
  mapCharacterRecordToEntity,
  mapOutfitEntityToRecord,
  mapOutfitRecordToEntity,
  mapPromptTemplateEntityToRecord,
  mapPromptTemplateRecordToEntity,
  mapSceneEntityToRecord,
  mapSceneRecordToEntity,
} from "../../../src/application/mappers/library-mappers";
import {
  mapProfileEntityToRecord,
  mapProfileRecordToEntity,
} from "../../../src/application/mappers/profile-mapper";
import {
  mapProjectEntityToRecord,
  mapProjectRecordToEntity,
} from "../../../src/application/mappers/project-mapper";
import {
  mapProjectRevisionEntityToRecord,
  mapProjectRevisionRecordToEntity,
} from "../../../src/application/mappers/project-revision-mapper";
import {
  mapSettingsEntityToRecord,
  mapSettingsRecordToEntity,
} from "../../../src/application/mappers/settings-mapper";
import {
  mapSyncOperationEntityToRecord,
  mapSyncOperationRecordToEntity,
} from "../../../src/application/mappers/sync-operation-mapper";
import { mapTagEntityToRecord, mapTagRecordToEntity } from "../../../src/application/mappers/tag-mapper";
import {
  mapTrashEntryEntityToRecord,
  mapTrashEntryRecordToEntity,
} from "../../../src/application/mappers/trash-mapper";

const metadata = {
  id: "entity-1",
  schemaVersion: 1 as const,
  createdAt: "2026-08-03T10:00:00.000Z",
  updatedAt: "2026-08-03T10:05:00.000Z",
  revision: 3,
};

const cases = [
  ["project", { ...metadata, name: "Studio", state: { seed: 7, nested: { enabled: true } }, currentRevisionId: "revision-1", autosavedAt: "2026-08-03T10:04:00.000Z", lifecycleStatus: "active", tagIds: ["tag-1"] }, mapProjectRecordToEntity, mapProjectEntityToRecord],
  ["project revision", { ...metadata, projectId: "project-1", sequence: 4, reason: "manual-save", parentRevisionId: "revision-0", snapshot: { name: "Studio", values: [1, 2] }, sha256: "abc123" }, mapProjectRevisionRecordToEntity, mapProjectRevisionEntityToRecord],
  ["profile", { ...metadata, kind: "custom", name: "Editorial", strategyId: "universal", strategyVersion: "1.0.0", configuration: { language: "en" } }, mapProfileRecordToEntity, mapProfileEntityToRecord],
  ["character", { ...metadata, name: "Alex", payload: { hair: "black" }, tagIds: ["tag-1"], sourceProjectId: "project-1" }, mapCharacterRecordToEntity, mapCharacterEntityToRecord],
  ["outfit", { ...metadata, name: "Formal", payload: { layers: ["shirt", "jacket"] }, tagIds: [], sourceProjectId: null }, mapOutfitRecordToEntity, mapOutfitEntityToRecord],
  ["scene", { ...metadata, name: "Rooftop", payload: { time: "night" }, tagIds: ["tag-2"], sourceProjectId: "project-1" }, mapSceneRecordToEntity, mapSceneEntityToRecord],
  ["prompt template", { ...metadata, name: "Portrait", payload: { sections: ["subject"] }, tagIds: [], sourceProjectId: null }, mapPromptTemplateRecordToEntity, mapPromptTemplateEntityToRecord],
  ["generation history", { ...metadata, projectId: "project-1", profileId: "universal", promptResult: { format: "text", text: "A portrait" }, resolvedStateHash: "state-hash", diagnosticSummary: { warnings: 0, errors: 0 } }, mapGenerationHistoryRecordToEntity, mapGenerationHistoryEntityToRecord],
  ["image asset", { ...metadata, blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), mimeType: "image/png", width: 640, height: 480, sha256: "image-hash", referencedEntityIds: ["project-1"] }, mapImageAssetRecordToEntity, mapImageAssetEntityToRecord],
  ["tag", { ...metadata, slug: "night-scene", name: "Night scene", color: "#123456" }, mapTagRecordToEntity, mapTagEntityToRecord],
  ["settings", { ...metadata, key: "workspace", scope: "global", projectId: null, featureFlags: { characterLibrary: false, outfitLibrary: false, sceneLibrary: false, promptLibrary: false, imageLibrary: false, revisionHistoryUi: false, cloudSync: false, aiKnowledgeBase: false }, activeProjectId: "project-1", migrationLedger: [{ migrationId: "v500-import", completedAt: "2026-08-03T10:03:00.000Z", sourceVersion: "500.6.11" }] }, mapSettingsRecordToEntity, mapSettingsEntityToRecord],
  ["trash entry", { ...metadata, originalStore: "Projects", entityType: "project", originalId: "project-1", payload: { name: "Deleted" }, deletedAt: "2026-08-03T10:05:00.000Z", restoreMetadata: { previousRevision: 2 } }, mapTrashEntryRecordToEntity, mapTrashEntryEntityToRecord],
  ["sync operation", { ...metadata, entityType: "project", entityId: "project-1", operation: "update", baseRevision: 2, payload: { name: "Changed" }, payloadHash: "payload-hash", status: "pending" }, mapSyncOperationRecordToEntity, mapSyncOperationEntityToRecord],
] as const;

describe("persistence record mappers", () => {
  it.each(cases)("roundtrips a valid %s record without changing its canonical bytes", (_name, record, toEntity, toRecord) => {
    const mapped = toEntity(record);

    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(canonicalSerialize(toRecord(mapped.value))).toBe(canonicalSerialize(record));
    expect(toRecord(mapped.value)).toEqual(record);
  });

  it.each(cases)("rejects an invalid %s record with the stable validation error", (_name, record, toEntity) => {
    const invalid = { ...record, schemaVersion: 2 };
    const mapped = toEntity(invalid);

    expect(mapped).toMatchObject({
      ok: false,
      error: {
        code: "storage/invalid-record",
        moduleId: "storage",
        recoverable: false,
      },
    });
  });

  it("rejects an invalid image asset with a stable result when no global Blob constructor exists", () => {
    const blobDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Blob");
    let mapped: ReturnType<typeof mapImageAssetRecordToEntity> | undefined;
    Object.defineProperty(globalThis, "Blob", { configurable: true, value: undefined });

    try {
      expect(() => {
        mapped = mapImageAssetRecordToEntity({
          ...metadata,
          blob: null,
          mimeType: "image/png",
          width: 640,
          height: 480,
          sha256: "image-hash",
          referencedEntityIds: [],
        });
      }).not.toThrow();
    } finally {
      if (blobDescriptor) Object.defineProperty(globalThis, "Blob", blobDescriptor);
    }

    expect(mapped).toMatchObject({
      ok: false,
      error: { code: "storage/invalid-record" },
    });
  });
});

function canonicalSerialize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value instanceof Blob) return { bytes: value.size, type: value.type };
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}
