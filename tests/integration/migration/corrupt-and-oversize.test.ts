import { createHash } from "node:crypto";

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import { ExportService, V600_IMPORT_MAX_BYTES } from "../../../src/application/services/export-service";
import { MigrationService } from "../../../src/application/services/migration-service";
import { V500_MAX_BYTES } from "../../../src/application/migrations/v500-to-v600";
import { V500_CURRENT_STORAGE_KEY, type ReadonlyKeyValueSource } from "../../../src/application/migrations/v500-storage-keys";
import type { Result } from "../../../src/contracts/core/result";
import type { RuntimeEnvironment } from "../../../src/contracts/runtime/runtime-environment";
import type { SettingsRepository } from "../../../src/contracts/storage/repositories/settings";
import type { ProjectRecord } from "../../../src/contracts/storage/records/project";
import type { ProjectRevisionRecord } from "../../../src/contracts/storage/records/project-revision";
import type { SettingsRecord } from "../../../src/contracts/storage/records/settings";
import type { StorageError } from "../../../src/contracts/storage/storage-errors";
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

describe("migration and import rejection boundaries", () => {
  it.each([
    ["damaged JSON", "{broken", "MIGRATION_INVALID_JSON"],
    ["wrong application signature", JSON.stringify({ application: "Other", version: "V500.6.11", data: { step: 1 } }), "MIGRATION_INVALID_SIGNATURE"],
    ["UTF-8 input beyond 2 MiB although its JS string length is below the byte limit", "ä".repeat(Math.floor(V500_MAX_BYTES / 2) + 1), "MIGRATION_SOURCE_OVERSIZE"],
  ])("rejects %s without any state", async (_label, raw, code) => {
    const harness = createHarness(`invalid-${code}`, new Source(raw));

    const result = await harness.migration.migrateBrowserState();

    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(await snapshot(harness)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("rejects a caller-provided fingerprint mismatch before persistence", async () => {
    const raw = fixture({ prompt: "fingerprint" });
    const harness = createHarness("expected-fingerprint", new Source(raw));

    const result = await harness.migration.migrateBrowserState({ expectedFingerprint: "f".repeat(64) });

    expect(result).toMatchObject({ ok: false, error: { code: "MIGRATION_FINGERPRINT_MISMATCH" } });
    expect(await snapshot(harness)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("rehashes the unchanged V500 bytes immediately before persistence and aborts if the provider changes its answer", async () => {
    const raw = fixture({ prompt: "rehash" });
    const fixed = createFixedRuntime();
    let hashes = 0;
    const runtime: RuntimeEnvironment = {
      ...fixed.runtime,
      hashProvider: { sha256: async () => `${hashes++}`.padStart(64, "0") },
    };
    const harness = createHarness("rehash", new Source(raw), runtime);

    const result = await harness.migration.migrateBrowserState();

    expect(hashes).toBe(2);
    expect(result).toMatchObject({ ok: false, error: { code: "MIGRATION_FINGERPRINT_MISMATCH" } });
    expect(await snapshot(harness)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("checks deterministic project and revision IDs before writing and never overwrites a collision", async () => {
    const raw = fixture({ prompt: "collision" });
    const fingerprint = createHash("sha256").update(raw).digest("hex");
    const harness = createHarness("collision", new Source(raw));
    const protectedRecord = {
      id: `project-v500-${fingerprint.slice(0, 24)}`,
      schemaVersion: 1 as const,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      revision: 9,
      name: "Protected",
      state: { protected: true },
      currentRevisionId: null,
      autosavedAt: null,
      lifecycleStatus: "active" as const,
      tagIds: [],
    };
    await value(harness.projects.put(protectedRecord));

    const result = await harness.migration.migrateBrowserState();

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(await value(harness.projects.getById(protectedRecord.id))).toEqual(protectedRecord);
    expect(await value(harness.revisions.listByProjectId(protectedRecord.id))).toEqual([]);
    expect(await value(harness.realSettings.list())).toEqual([]);
  });

  it("rolls back project and revision when the final settings write fails", async () => {
    const raw = fixture({ prompt: "rollback" });
    const harness = createHarness("atomic-failure", new Source(raw), undefined, true);

    const result = await harness.migration.migrateBrowserState();

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(await snapshot(harness)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("uses the exact 10 MiB UTF-8 limit for V600 imports and performs no reads or writes for an oversized input", async () => {
    const harness = createHarness("v600-oversize", new Source(null));
    const oversized = "ä".repeat(Math.floor(V600_IMPORT_MAX_BYTES / 2) + 1);

    const result = await harness.exporter.importProject(oversized);

    expect(result).toMatchObject({ ok: false, error: { code: "IMPORT_OVERSIZE" } });
    expect(await snapshot(harness)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("rejects oversized raw V500 bytes before attempting UTF-8 decode", async () => {
    const harness = createHarness("v500-raw-oversize", new Source(null));
    const oversizedInvalidUtf8 = new Uint8Array(V500_MAX_BYTES + 1).fill(0xff);

    const result = await harness.migration.importV500Project(oversizedInvalidUtf8);

    expect(result).toMatchObject({ ok: false, error: { code: "MIGRATION_SOURCE_OVERSIZE" } });
    expect(await snapshot(harness)).toEqual({ projects: [], revisions: [], settings: [] });
  });

  it("forwards optional read transactions through project, revision, and settings repositories", async () => {
    const factory = new IDBFactory();
    const name = "prompt-studio-v600-task10-task12-read-transaction-forwarding";
    const adapter = new IndexedDbAdapter({ factory, databaseName: name });
    resources.push({ factory, adapter, name });
    const transactions = new IndexedDbTransactionRunner(adapter);
    const projects = new IndexedDbProjectRepository(adapter);
    const revisions = new IndexedDbProjectRevisionRepository(adapter);
    const settings = new IndexedDbSettingsRepository(adapter);

    const projectRead = await transactions.run(
      { stores: ["Settings"], mode: "readonly" },
      (transaction) => projects.getById("missing", transaction),
    );
    const revisionRead = await transactions.run(
      { stores: ["Settings"], mode: "readonly" },
      (transaction) => revisions.getById("missing", transaction),
    );
    const settingsRead = await transactions.run(
      { stores: ["Projects"], mode: "readonly" },
      (transaction) => settings.getByKey("global", transaction),
    );

    expect(projectRead).toMatchObject({ ok: false, error: { code: "storage/unavailable", store: "Projects" } });
    expect(revisionRead).toMatchObject({ ok: false, error: { code: "storage/unavailable", store: "ProjectRevisions" } });
    expect(settingsRead).toMatchObject({ ok: false, error: { code: "storage/unavailable", store: "Settings" } });
  });

  it("detects a project collision created immediately before the migration transaction without overwriting it", async () => {
    const raw = fixture({ prompt: "late-project-collision" });
    const fingerprint = createHash("sha256").update(raw).digest("hex");
    const protectedRecord = projectCollisionRecord(`project-v500-${fingerprint.slice(0, 24)}`);
    const harness = createHarness("late-project-collision", new Source(raw), undefined, false, async ({ projects }) => {
      await value(projects.put(protectedRecord));
    });

    const result = await harness.migration.migrateBrowserState();

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict", store: "Projects" } });
    expect(await value(harness.projects.getById(protectedRecord.id))).toEqual(protectedRecord);
    expect(await value(harness.revisions.listByProjectId(protectedRecord.id))).toEqual([]);
    expect(await value(harness.realSettings.list())).toEqual([]);
  });

  it("detects a revision collision created immediately before the migration transaction without overwriting it", async () => {
    const raw = fixture({ prompt: "late-revision-collision" });
    const fingerprint = createHash("sha256").update(raw).digest("hex");
    const projectId = `project-v500-${fingerprint.slice(0, 24)}`;
    const protectedRecord = revisionCollisionRecord(`project-revision-v500-${fingerprint.slice(0, 24)}`);
    const harness = createHarness("late-revision-collision", new Source(raw), undefined, false, async ({ revisions }) => {
      await value(revisions.put(protectedRecord));
    });

    const result = await harness.migration.migrateBrowserState();

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict", store: "ProjectRevisions" } });
    expect(await value(harness.revisions.getById(protectedRecord.id))).toEqual(protectedRecord);
    expect(await value(harness.projects.getById(projectId))).toBeNull();
    expect(await value(harness.realSettings.list())).toEqual([]);
  });

  it("observes an idempotency ledger created immediately before the transaction and preserves those settings byte-for-byte", async () => {
    const raw = fixture({ prompt: "late-ledger" });
    const fingerprint = createHash("sha256").update(raw).digest("hex");
    const migrationId = `v500-to-v600:${fingerprint}`;
    const protectedSettings = settingsCollisionRecord(migrationId);
    const harness = createHarness("late-ledger", new Source(raw), undefined, false, async ({ settings }) => {
      await value(settings.put(protectedSettings));
    });

    const result = await harness.migration.migrateBrowserState();

    expect(result).toMatchObject({ ok: true, value: { status: "already-migrated", migrationId } });
    expect(await value(harness.realSettings.getByKey("global"))).toEqual(protectedSettings);
    expect(await value(harness.projects.list())).toEqual([]);
    expect(await value(harness.revisions.listByProjectId(`project-v500-${fingerprint.slice(0, 24)}`))).toEqual([]);
  });
});

class Source implements ReadonlyKeyValueSource {
  constructor(private readonly raw: string | null) {}
  getItem(key: string): string | null {
    return key === V500_CURRENT_STORAGE_KEY ? this.raw : null;
  }
}

function createHarness(
  suffix: string,
  source: ReadonlyKeyValueSource,
  runtime = createFixedRuntime({ now: "2026-08-12T10:00:00.000Z" }).runtime,
  failSettings = false,
  beforeTransaction?: (repositories: {
    readonly projects: IndexedDbProjectRepository;
    readonly revisions: IndexedDbProjectRevisionRepository;
    readonly settings: IndexedDbSettingsRepository;
  }) => Promise<void>,
) {
  const factory = new IDBFactory();
  const name = `prompt-studio-v600-task10-task12-invalid-${suffix}`;
  const adapter = new IndexedDbAdapter({ factory, databaseName: name });
  resources.push({ factory, adapter, name });
  const projects = new IndexedDbProjectRepository(adapter);
  const revisions = new IndexedDbProjectRevisionRepository(adapter);
  const realSettings = new IndexedDbSettingsRepository(adapter);
  const settings: SettingsRepository = failSettings
    ? { ...realSettings, getByKey: realSettings.getByKey, list: realSettings.list, delete: realSettings.delete, put: async () => unavailable() }
    : realSettings;
  const runner = new IndexedDbTransactionRunner(adapter);
  const transactions: StorageTransactionCoordinator = beforeTransaction === undefined
    ? runner
    : {
        run: async (options, operation) => {
          await beforeTransaction({ projects, revisions, settings: realSettings });
          return runner.run(options, operation);
        },
      };
  return {
    projects,
    revisions,
    realSettings,
    migration: new MigrationService({ runtime, source, projects, revisions, settings, transactions }),
    exporter: new ExportService({ runtime, projects, revisions, settings, transactions }),
  };
}

function projectCollisionRecord(id: string): ProjectRecord {
  return {
    id,
    schemaVersion: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    revision: 9,
    name: "Protected late project",
    state: { protected: true },
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [],
  };
}

function revisionCollisionRecord(id: string): ProjectRevisionRecord {
  return {
    id,
    schemaVersion: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    revision: 7,
    projectId: "protected-foreign-project",
    sequence: 4,
    reason: "milestone",
    parentRevisionId: null,
    snapshot: { protected: true },
    sha256: "protected-revision-hash",
  };
}

function settingsCollisionRecord(migrationId: string): SettingsRecord {
  return {
    id: "foreign-settings-record",
    schemaVersion: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T01:00:00.000Z",
    revision: 12,
    key: "global",
    scope: "global",
    projectId: null,
    featureFlags: {
      characterLibrary: true,
      outfitLibrary: false,
      sceneLibrary: false,
      promptLibrary: false,
      imageLibrary: false,
      revisionHistoryUi: false,
      cloudSync: false,
      aiKnowledgeBase: false,
    },
    activeProjectId: "protected-active-project",
    migrationLedger: [{
      migrationId,
      completedAt: "2026-08-01T01:00:00.000Z",
      sourceVersion: "V500.6.11",
    }],
  };
}

function fixture(data: Readonly<Record<string, unknown>>): string {
  return JSON.stringify({ application: "Prompt Studio", version: "V500.6.11", data });
}

function unavailable(): Result<never, StorageError> {
  return { ok: false, error: { code: "storage/unavailable", moduleId: "storage", severity: "error", userMessage: "failed", technicalMessage: "forced settings failure", recoverable: true, store: "Settings" } };
}

async function snapshot(harness: ReturnType<typeof createHarness>) {
  return {
    projects: await value(harness.projects.list()),
    revisions: await value(harness.revisions.listByProjectId("missing")),
    settings: await value(harness.realSettings.list()),
  };
}

async function value<T>(promise: Promise<Result<T, StorageError>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(result.error.technicalMessage);
  return result.value;
}
