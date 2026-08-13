import { createHash } from "node:crypto";

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import { MigrationService } from "../../../src/application/services/migration-service";
import { V500_MAX_BYTES } from "../../../src/application/migrations/v500-to-v600";
import {
  V500_CURRENT_STORAGE_KEY,
  V500_LEGACY_STORAGE_KEYS,
  type ReadonlyKeyValueSource,
} from "../../../src/application/migrations/v500-storage-keys";
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

describe("V500 browser-state migration", () => {
  it("reads the current key without mutation and atomically creates one project, migration revision, settings link, and fingerprint ledger", async () => {
    const raw = v500Fixture({ step: 4, profile: "Universal", promptLanguage: "Deutsch" });
    const source = new FixtureSource([[V500_CURRENT_STORAGE_KEY, raw]]);
    const harness = createHarness("current", source);
    const before = source.snapshot();
    const fingerprint = sha256(raw);

    const result = await harness.service.migrateBrowserState();

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "migrated",
        fingerprint,
        migrationId: `v500-to-v600:${fingerprint}`,
        sourceKey: V500_CURRENT_STORAGE_KEY,
        report: { migratedProjectCount: 1, skippedProjectCount: 0 },
      },
    });
    expect(source.snapshot()).toEqual(before);
    expect(source.reads).toEqual([V500_CURRENT_STORAGE_KEY]);

    const projects = await value(harness.projects.list());
    expect(projects).toEqual([
      expect.objectContaining({
        id: `project-v500-${fingerprint.slice(0, 24)}`,
        state: { step: 4, profile: "Universal", promptLanguage: "Deutsch" },
        currentRevisionId: `project-revision-v500-${fingerprint.slice(0, 24)}`,
      }),
    ]);
    const revisions = await value(harness.revisions.listByProjectId(projects[0]!.id));
    expect(revisions).toEqual([
      expect.objectContaining({ reason: "migration", sequence: 1, snapshot: projects[0]!.state }),
    ]);
    expect(await value(harness.settings.getByKey("global"))).toMatchObject({
      activeProjectId: projects[0]!.id,
      featureFlags: { cloudSync: false, aiKnowledgeBase: false },
      migrationLedger: [{
        migrationId: `v500-to-v600:${fingerprint}`,
        completedAt: "2026-08-12T08:00:00.000Z",
        sourceVersion: "V500.6.11-Binding-Selfie-Open-Garment-State",
      }],
    });
  });

  it("selects the first valid candidate in the authoritative current-to-legacy priority order", async () => {
    const firstLegacy = V500_LEGACY_STORAGE_KEYS[0]!;
    const secondLegacy = V500_LEGACY_STORAGE_KEYS[1]!;
    const firstRaw = v500Fixture({ marker: "newest-valid" });
    const secondRaw = v500Fixture({ marker: "older-valid" });
    const source = new FixtureSource([
      [V500_CURRENT_STORAGE_KEY, "{corrupt"],
      [firstLegacy, firstRaw],
      [secondLegacy, secondRaw],
    ]);
    const harness = createHarness("legacy-priority", source);

    const result = await harness.service.migrateBrowserState();

    expect(result).toMatchObject({ ok: true, value: { sourceKey: firstLegacy } });
    expect(source.reads).toEqual([V500_CURRENT_STORAGE_KEY, firstLegacy]);
    expect((await value(harness.projects.list()))[0]?.state).toEqual({ marker: "newest-valid" });
  });

  it("is idempotent: an identical second migration creates no IDs, revisions, writes, or changed records", async () => {
    const raw = v500Fixture({ marker: "repeatable" });
    const source = new FixtureSource([[V500_CURRENT_STORAGE_KEY, raw]]);
    const harness = createHarness("idempotent", source);
    const first = await harness.service.migrateBrowserState();
    expect(first.ok).toBe(true);
    const before = await persistedSnapshot(harness);

    const second = await harness.service.migrateBrowserState();

    expect(second).toMatchObject({ ok: true, value: { status: "already-migrated" } });
    expect(await persistedSnapshot(harness)).toEqual(before);
  });

  it("imports a V500 project file at exactly the inclusive 2 MiB UTF-8 boundary through the same atomic path", async () => {
    const base = v500Fixture({ marker: "exact-v500-file-boundary" });
    const raw = `${base}${" ".repeat(V500_MAX_BYTES - Buffer.byteLength(base, "utf8"))}`;
    const harness = createHarness("file-boundary", new FixtureSource([]));

    const result = await harness.service.importV500Project(raw);

    expect(Buffer.byteLength(raw, "utf8")).toBe(V500_MAX_BYTES);
    expect(result).toMatchObject({ ok: true, value: { status: "migrated", sourceKey: "v500-project-file" } });
    expect((await value(harness.projects.list()))[0]?.state).toEqual({ marker: "exact-v500-file-boundary" });
  });

  it.each(V500_LEGACY_STORAGE_KEYS)("recognizes the authoritative legacy key %s", async (legacyKey) => {
    const raw = v500Fixture({ legacyKey });
    const harness = createHarness(`legacy-${V500_LEGACY_STORAGE_KEYS.indexOf(legacyKey)}`, new FixtureSource([[legacyKey, raw]]));

    const result = await harness.service.migrateBrowserState();

    expect(result).toMatchObject({ ok: true, value: { sourceKey: legacyKey } });
  });
});

class FixtureSource implements ReadonlyKeyValueSource {
  readonly reads: string[] = [];
  private readonly values: ReadonlyMap<string, string>;

  constructor(entries: readonly (readonly [string, string])[]) {
    this.values = new Map(entries);
  }

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  snapshot(): readonly (readonly [string, string])[] {
    return [...this.values.entries()];
  }
}

function createHarness(suffix: string, source: ReadonlyKeyValueSource) {
  const factory = new IDBFactory();
  const name = `prompt-studio-v600-task10-task12-migration-${suffix}`;
  const adapter = new IndexedDbAdapter({ factory, databaseName: name });
  resources.push({ factory, adapter, name });
  const projects = new IndexedDbProjectRepository(adapter);
  const revisions = new IndexedDbProjectRevisionRepository(adapter);
  const settings = new IndexedDbSettingsRepository(adapter);
  const service = new MigrationService({
    runtime: createFixedRuntime({ now: "2026-08-12T08:00:00.000Z" }).runtime,
    source,
    projects,
    revisions,
    settings,
    transactions: new IndexedDbTransactionRunner(adapter),
  });
  return { projects, revisions, service, settings };
}

function v500Fixture(data: Readonly<Record<string, unknown>>): string {
  return JSON.stringify({
    application: "Prompt Studio",
    version: "V500.6.11-Binding-Selfie-Open-Garment-State",
    schemaVersion: 6,
    savedAt: "2026-08-12T07:00:00.000Z",
    data,
  });
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function persistedSnapshot(harness: ReturnType<typeof createHarness>) {
  return {
    projects: await value(harness.projects.list()),
    revisions: await value(harness.revisions.listByProjectId(
      (await value(harness.projects.list()))[0]!.id,
    )),
    settings: await value(harness.settings.list()),
  };
}

async function value<T>(promise: Promise<{ ok: true; value: T } | { ok: false; error: { technicalMessage: string } }>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(result.error.technicalMessage);
  return result.value;
}
