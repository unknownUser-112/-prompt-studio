import { createHash } from "node:crypto";

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import { ExportService, V600_IMPORT_MAX_BYTES } from "../../../src/application/services/export-service";
import type { ProjectRecord } from "../../../src/contracts/storage/records/project";
import type { ProjectRevisionRecord } from "../../../src/contracts/storage/records/project-revision";
import type { SettingsRecord } from "../../../src/contracts/storage/records/settings";
import type { StorageTransactionCoordinator } from "../../../src/contracts/storage/transaction";
import { IndexedDbAdapter } from "../../../src/infrastructure/indexeddb/indexeddb-adapter";
import { IndexedDbProjectRepository } from "../../../src/infrastructure/indexeddb/repositories/project-repository";
import { IndexedDbProjectRevisionRepository } from "../../../src/infrastructure/indexeddb/repositories/project-revision-repository";
import { IndexedDbSettingsRepository } from "../../../src/infrastructure/indexeddb/repositories/settings-repository";
import { IndexedDbTransactionRunner } from "../../../src/infrastructure/indexeddb/transaction-runner";
import { createFixedRuntime } from "../../helpers/fixed-runtime";
import { deleteTestDatabase } from "../../helpers/indexeddb-harness";

const resources: Array<{ factory: IDBFactory; adapter: IndexedDbAdapter; name: string }> = [];

afterEach(async () => {
  for (const resource of resources.splice(0)) {
    resource.adapter.close();
    await deleteTestDatabase(resource.factory, resource.name);
  }
});

describe("V600 import and export", () => {
  it("exports identical confirmed state as canonical LF JSON with a verified SHA-256 checksum", async () => {
    const source = createHarness("export-source");
    await seed(source);

    const first = await source.service.exportProject("project-export");
    const second = await source.service.exportProject("project-export");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.bytes).toEqual(first.value.bytes);
    expect(second.value.text).toBe(first.value.text);
    expect(first.value.text.endsWith("\n")).toBe(true);
    expect(first.value.text).not.toContain("\r");
    const parsed = JSON.parse(first.value.text) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(["checksum", "manifest", "payload"]);
    const unicode = ((parsed.payload as Record<string, unknown>).project as ProjectRecord).state.unicode;
    expect(Object.keys(unicode as Record<string, unknown>)).toEqual(["z", "ä"]);
    const { checksum, ...signed } = parsed;
    expect(checksum).toBe(sha256(canonicalJson(signed)));
    assertLexicographicObjectKeys(parsed);
  });

  it("serializes integer-like object keys in lexical rather than JavaScript enumeration order", async () => {
    const source = createHarness("integer-keys-source");
    await value(source.projects.put({
      ...projectRecord(),
      state: { integerKeys: { "2": "two", "10": "ten" } },
    }));

    const exported = await source.service.exportProject("project-export");

    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const tenIndex = exported.value.text.indexOf('"10": "ten"');
    const twoIndex = exported.value.text.indexOf('"2": "two"');
    expect(tenIndex).toBeGreaterThan(-1);
    expect(twoIndex).toBeGreaterThan(tenIndex);
    const parsed = JSON.parse(exported.value.text) as Record<string, unknown>;
    const { checksum, ...signed } = parsed;
    expect(checksum).toBe(sha256(canonicalJson(signed)));
  });

  it("imports a valid export into a fresh store atomically and records one import revision", async () => {
    const source = createHarness("roundtrip-source");
    await seed(source);
    const exported = await source.service.exportProject("project-export");
    if (!exported.ok) throw new Error(exported.error.technicalMessage);
    const target = createHarness("roundtrip-target");

    const imported = await target.service.importProject(exported.value.bytes);

    expect(imported).toMatchObject({
      ok: true,
      value: {
        project: { id: "project-export", state: { nested: { a: 1, z: 2 }, prompt: "portrait", unicode: { z: 1, "ä": 2 } } },
        revision: { id: "project-revision-000001", reason: "import", sequence: 2 },
      },
    });
    expect(await value(target.projects.list())).toHaveLength(1);
    expect(await value(target.revisions.listByProjectId("project-export"))).toEqual([
      expect.objectContaining({ id: "revision-export", reason: "created", sequence: 1 }),
      expect.objectContaining({ id: "project-revision-000001", reason: "import", sequence: 2 }),
    ]);
    expect(await value(target.settings.getByKey("global"))).toMatchObject({
      activeProjectId: "project-export",
      featureFlags: { cloudSync: false, aiKnowledgeBase: false },
    });
  });

  it("returns IMPORT_ASSET_BUNDLE_UNSUPPORTED before any write for an otherwise valid binary-asset manifest", async () => {
    const source = createHarness("assets-source");
    await seed(source);
    const exported = await source.service.exportProject("project-export");
    if (!exported.ok) throw new Error(exported.error.technicalMessage);
    const parsed = JSON.parse(exported.value.text) as Record<string, unknown>;
    const payload = parsed.payload as Record<string, unknown>;
    payload.assetBundle = { encoding: "base64", entries: ["AA=="] };
    const signed = { manifest: parsed.manifest, payload };
    const withAssets = canonicalJson({ checksum: sha256(canonicalJson(signed)), ...signed });
    const target = createHarness("assets-target");

    const result = await target.service.importProject(withAssets);

    expect(result).toMatchObject({ ok: false, error: { code: "IMPORT_ASSET_BUNDLE_UNSUPPORTED" } });
    expect(await snapshot(target)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("rejects a correctly signed asset bundle nested inside the project record without partial state", async () => {
    const source = createHarness("nested-assets-source");
    await seed(source);
    const exported = await source.service.exportProject("project-export");
    if (!exported.ok) throw new Error(exported.error.technicalMessage);
    const parsed = JSON.parse(exported.value.text) as Record<string, unknown>;
    const payload = parsed.payload as Record<string, unknown>;
    const project = payload.project as Record<string, unknown>;
    project.imageAssets = [{ id: "image-1", bytes: "AA==" }];
    const signed = { manifest: parsed.manifest, payload };
    const withAssets = canonicalJson({ checksum: sha256(canonicalJson(signed)), ...signed });
    const target = createHarness("nested-assets-target");

    const result = await target.service.importProject(withAssets);

    expect(result).toMatchObject({ ok: false, error: { code: "IMPORT_ASSET_BUNDLE_UNSUPPORTED" } });
    expect(await snapshot(target)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("rejects a correctly signed asset bundle at the import root before any write", async () => {
    const exported = await validExport("root-assets-source");
    const parsed = JSON.parse(exported.text) as Record<string, unknown>;
    parsed.assetBundle = { encoding: "base64", entries: ["AA=="] };
    const target = createHarness("root-assets-target");

    const result = await target.service.importProject(canonicalJson(parsed));

    expect(result).toMatchObject({ ok: false, error: { code: "IMPORT_ASSET_BUNDLE_UNSUPPORTED" } });
    expect(await snapshot(target)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("rejects benign extra top-level fields instead of accepting a non-exact import shape", async () => {
    const exported = await validExport("extra-root-field-source");
    const parsed = JSON.parse(exported.text) as Record<string, unknown>;
    parsed.metadata = { note: "must not be accepted" };
    const target = createHarness("extra-root-field-target");

    const result = await target.service.importProject(canonicalJson(parsed));

    expect(result).toMatchObject({ ok: false, error: { code: "IMPORT_MANIFEST_INVALID" } });
    expect(await snapshot(target)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("rejects a changed checksum before persistence", async () => {
    const source = createHarness("checksum-source");
    await seed(source);
    const exported = await source.service.exportProject("project-export");
    if (!exported.ok) throw new Error(exported.error.technicalMessage);
    const parsed = JSON.parse(exported.value.text) as Record<string, unknown>;
    parsed.checksum = "0".repeat(64);
    const target = createHarness("checksum-target");

    const result = await target.service.importProject(canonicalJson(parsed));

    expect(result).toMatchObject({ ok: false, error: { code: "IMPORT_CHECKSUM_MISMATCH" } });
    expect(await snapshot(target)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("detects a project collision created immediately before the import transaction without overwriting it", async () => {
    const exported = await validExport("late-import-project-source");
    const protectedProject = { ...projectRecord(), name: "Protected late import project", state: { protected: true } };
    const target = createHarness("late-import-project-target", async ({ projects }) => {
      await value(projects.put(protectedProject));
    });

    const result = await target.service.importProject(exported.bytes);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict", store: "Projects" } });
    expect(await value(target.projects.getById(protectedProject.id))).toEqual(protectedProject);
    expect(await value(target.revisions.listByProjectId(protectedProject.id))).toEqual([]);
    expect(await value(target.settings.list())).toEqual([]);
  });

  it("detects an exported revision collision created immediately before the import transaction without overwriting it", async () => {
    const exported = await validExport("late-exported-revision-source");
    const protectedRevision = { ...revisionRecord(), projectId: "protected-foreign-project", snapshot: { protected: true } };
    const target = createHarness("late-exported-revision-target", async ({ revisions }) => {
      await value(revisions.put(protectedRevision));
    });

    const result = await target.service.importProject(exported.bytes);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict", store: "ProjectRevisions" } });
    expect(await value(target.revisions.getById(protectedRevision.id))).toEqual(protectedRevision);
    expect(await value(target.projects.list())).toEqual([]);
    expect(await value(target.settings.list())).toEqual([]);
  });

  it("detects a generated import-revision collision created immediately before the transaction without overwriting it", async () => {
    const exported = await validExport("late-import-revision-source");
    const protectedRevision: ProjectRevisionRecord = {
      ...revisionRecord(),
      id: "project-revision-000001",
      projectId: "protected-foreign-project",
      snapshot: { protected: true },
    };
    const target = createHarness("late-import-revision-target", async ({ revisions }) => {
      await value(revisions.put(protectedRevision));
    });

    const result = await target.service.importProject(exported.bytes);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict", store: "ProjectRevisions" } });
    expect(await value(target.revisions.getById(protectedRevision.id))).toEqual(protectedRevision);
    expect(await value(target.projects.list())).toEqual([]);
    expect(await value(target.settings.list())).toEqual([]);
  });

  it("reads settings created immediately before import in the same transaction and preserves their identity and flags", async () => {
    const exported = await validExport("late-import-settings-source");
    const protectedSettings: SettingsRecord = {
      ...settingsRecord("protected-active-project"),
      id: "foreign-settings-record",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T01:00:00.000Z",
      revision: 12,
      featureFlags: { ...settingsRecord(null).featureFlags, characterLibrary: true },
    };
    const target = createHarness("late-import-settings-target", async ({ settings }) => {
      await value(settings.put(protectedSettings));
    });

    const result = await target.service.importProject(exported.bytes);

    expect(result).toMatchObject({ ok: true, value: { project: { id: "project-export" } } });
    expect(await value(target.settings.getByKey("global"))).toEqual({
      ...protectedSettings,
      activeProjectId: "project-export",
      updatedAt: "2026-08-12T09:00:00.000Z",
      revision: 13,
    });
  });

  it("accepts a valid V600 import at exactly the inclusive 10 MiB UTF-8 boundary", async () => {
    const source = createHarness("exact-limit-source");
    await seed(source);
    const exported = await source.service.exportProject("project-export");
    if (!exported.ok) throw new Error(exported.error.technicalMessage);
    const exactLimit = new Uint8Array(V600_IMPORT_MAX_BYTES);
    exactLimit.fill(0x20);
    exactLimit.set(exported.value.bytes);
    const target = createHarness("exact-limit-target");

    const result = await target.service.importProject(exactLimit);

    expect(exactLimit.byteLength).toBe(V600_IMPORT_MAX_BYTES);
    expect(result).toMatchObject({ ok: true, value: { project: { id: "project-export" } } });
  });
});

function createHarness(
  suffix: string,
  beforeTransaction?: (repositories: {
    readonly projects: IndexedDbProjectRepository;
    readonly revisions: IndexedDbProjectRevisionRepository;
    readonly settings: IndexedDbSettingsRepository;
  }) => Promise<void>,
) {
  const factory = new IDBFactory();
  const name = `prompt-studio-v600-task10-task12-export-${suffix}`;
  const adapter = new IndexedDbAdapter({ factory, databaseName: name });
  resources.push({ factory, adapter, name });
  const projects = new IndexedDbProjectRepository(adapter);
  const revisions = new IndexedDbProjectRevisionRepository(adapter);
  const settings = new IndexedDbSettingsRepository(adapter);
  const runner = new IndexedDbTransactionRunner(adapter);
  let beforeTransactionInvoked = false;
  const transactions: StorageTransactionCoordinator = beforeTransaction === undefined
    ? runner
    : {
        run: async (options, operation) => {
          if (!beforeTransactionInvoked) {
            beforeTransactionInvoked = true;
            await beforeTransaction({ projects, revisions, settings });
          }
          return runner.run(options, operation);
        },
      };
  const service = new ExportService({
    runtime: createFixedRuntime({ now: "2026-08-12T09:00:00.000Z" }).runtime,
    projects,
    revisions,
    settings,
    transactions,
  });
  return { projects, revisions, service, settings };
}

async function validExport(suffix: string) {
  const source = createHarness(suffix);
  await seed(source);
  const exported = await source.service.exportProject("project-export");
  if (!exported.ok) throw new Error(exported.error.technicalMessage);
  return exported.value;
}

async function seed(harness: ReturnType<typeof createHarness>): Promise<void> {
  await value(harness.projects.put(projectRecord()));
  await value(harness.revisions.put(revisionRecord()));
  await value(harness.settings.put(settingsRecord("project-export")));
}

function projectRecord(): ProjectRecord {
  return {
    id: "project-export",
    schemaVersion: 1,
    createdAt: "2026-08-12T07:00:00.000Z",
    updatedAt: "2026-08-12T07:30:00.000Z",
    revision: 3,
    name: "Canonical Export",
    state: { prompt: "portrait", nested: { z: 2, a: 1 }, unicode: { "ä": 2, z: 1 } },
    currentRevisionId: "revision-export",
    autosavedAt: "2026-08-12T07:30:00.000Z",
    lifecycleStatus: "active",
    tagIds: ["tag-z", "tag-a"],
  };
}

function revisionRecord(): ProjectRevisionRecord {
  return {
    id: "revision-export",
    schemaVersion: 1,
    createdAt: "2026-08-12T07:00:00.000Z",
    updatedAt: "2026-08-12T07:00:00.000Z",
    revision: 0,
    projectId: "project-export",
    sequence: 1,
    reason: "created",
    parentRevisionId: null,
    snapshot: { prompt: "portrait", nested: { z: 2, a: 1 }, unicode: { "ä": 2, z: 1 } },
    sha256: "confirmed-state-hash",
  };
}

function settingsRecord(activeProjectId: string | null): SettingsRecord {
  return {
    id: "settings-global",
    schemaVersion: 1,
    createdAt: "2026-08-12T06:00:00.000Z",
    updatedAt: "2026-08-12T06:00:00.000Z",
    revision: 0,
    key: "global",
    scope: "global",
    projectId: null,
    featureFlags: {
      characterLibrary: false,
      outfitLibrary: false,
      sceneLibrary: false,
      promptLibrary: false,
      imageLibrary: false,
      revisionHistoryUi: false,
      cloudSync: false,
      aiKnowledgeBase: false,
    },
    activeProjectId,
    migrationLedger: [],
  };
}

function canonicalJson(value: unknown): string {
  return `${serializeCanonical(value, 0)}\n`;
}

function serializeCanonical(value: unknown, depth: number): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const indentation = "  ".repeat(depth);
  const childIndentation = "  ".repeat(depth + 1);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const entries = value.map((entry) => `${childIndentation}${serializeCanonical(entry, depth + 1)}`);
    return `[\n${entries.join(",\n")}\n${indentation}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => compareCodePoints(left, right));
  if (entries.length === 0) return "{}";
  const properties = entries.map(([key, entry]) =>
    `${childIndentation}${JSON.stringify(key)}: ${serializeCanonical(entry, depth + 1)}`
  );
  return `{\n${properties.join(",\n")}\n${indentation}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertLexicographicObjectKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertLexicographicObjectKeys);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const keys = Object.keys(value);
  expect(keys).toEqual([...keys].sort(compareCodePoints));
  Object.values(value).forEach(assertLexicographicObjectKeys);
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function snapshot(harness: ReturnType<typeof createHarness>) {
  return {
    projects: await value(harness.projects.list()),
    revisions: await value(harness.revisions.listByProjectId("project-export")),
    settings: await value(harness.settings.list()),
  };
}

async function value<T>(promise: Promise<{ ok: true; value: T } | { ok: false; error: { technicalMessage: string } }>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(result.error.technicalMessage);
  return result.value;
}
