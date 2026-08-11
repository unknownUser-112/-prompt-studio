import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import { AutosaveService, type AutosaveScheduler } from "../../../src/application/services/autosave-service";
import { ProjectService, type ProjectAutosaveControl, type ProjectEventPublisher } from "../../../src/application/services/project-service";
import type { Result } from "../../../src/contracts/core/result";
import type { ProjectRecord } from "../../../src/contracts/storage/records/project";
import type { SettingsRecord } from "../../../src/contracts/storage/records/settings";
import type { StorageError } from "../../../src/contracts/storage/storage-errors";
import type { StorageTransactionCoordinator } from "../../../src/contracts/storage/transaction";
import type { Project } from "../../../src/domain/entities/project";
import { IndexedDbAdapter } from "../../../src/infrastructure/indexeddb/indexeddb-adapter";
import { IndexedDbProjectRepository } from "../../../src/infrastructure/indexeddb/repositories/project-repository";
import { IndexedDbProjectRevisionRepository } from "../../../src/infrastructure/indexeddb/repositories/project-revision-repository";
import { IndexedDbSettingsRepository } from "../../../src/infrastructure/indexeddb/repositories/settings-repository";
import { IndexedDbTrashRepository } from "../../../src/infrastructure/indexeddb/repositories/trash-repository";
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

describe("project trash and duplication", () => {
  it("duplicates with new project and revision ids while reusing asset references", async () => {
    const harness = await createHarness("duplicate");

    const result = await harness.service.duplicate(harness.source.id);

    expect(result).toMatchObject({
      ok: true,
      value: {
        id: "project-000001",
        name: "Source Kopie",
        currentRevisionId: "project-revision-000001",
        state: { prompt: "source", assetIds: ["asset-1", "asset-2"] },
      },
    });
    if (!result.ok) return;
    expect(result.value.id).not.toBe(harness.source.id);
    expect(result.value.state).not.toBe(harness.source.state);
    expect(result.value.state.assetIds).toEqual(harness.source.state.assetIds);
    expect(await value(harness.projects.getById(harness.source.id))).toEqual({ ...harness.source, schemaVersion: 1 });
    expect(await value(harness.revisions.listByProjectId(result.value.id))).toEqual([
      expect.objectContaining({
        id: "project-revision-000001",
        projectId: "project-000001",
        reason: "duplicate",
        sequence: 1,
      }),
    ]);
    expect(harness.events.map((event) => event.type)).toEqual(["ProjectDuplicated"]);
  });

  it("does not overwrite an existing project when a duplicate id collides", async () => {
    const harness = await createHarness("duplicate-collision");
    const collision = { ...harness.source, schemaVersion: 1 as const, id: "project-000001", name: "Must survive" };
    await value(harness.projects.put(collision));

    const result = await harness.service.duplicate(harness.source.id);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(await value(harness.projects.getById(collision.id))).toEqual(collision);
    expect(await value(harness.revisions.listByProjectId(collision.id))).toEqual([]);
    expect(harness.events).toEqual([]);
  });

  it("does not overwrite an existing revision when the duplicate revision id collides", async () => {
    const harness = await createHarness("duplicate-revision-collision");
    const collision = revisionRecord("project-revision-000001", "protected-project");
    await value(harness.revisions.put(collision));

    const result = await harness.service.duplicate(harness.source.id);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(await value(harness.revisions.getById(collision.id))).toEqual(collision);
    expect(await value(harness.projects.getById("project-000001"))).toBeNull();
    expect(harness.events).toEqual([]);
  });

  it("atomically moves the complete project record to trash and restores it with a restore revision", async () => {
    const harness = await createHarness("trash-restore");

    const deleted = await harness.service.softDelete(harness.source.id);

    expect(deleted).toMatchObject({ ok: true, value: { id: "trash-entry-000001", originalId: harness.source.id } });
    expect(await value(harness.projects.getById(harness.source.id))).toBeNull();
    const trashEntry = await value(harness.trash.getById("trash-entry-000001"));
    expect(trashEntry?.payload).toEqual({ ...harness.source, schemaVersion: 1 });
    expect((await value(harness.settings.getByKey("global")))?.activeProjectId).toBeNull();

    const restored = await harness.service.restore("trash-entry-000001");

    expect(restored).toMatchObject({
      ok: true,
      value: {
        id: harness.source.id,
        name: harness.source.name,
        currentRevisionId: "project-revision-000001",
      },
    });
    expect(await value(harness.trash.getById("trash-entry-000001"))).toBeNull();
    expect(await value(harness.revisions.listByProjectId(harness.source.id))).toEqual([
      expect.objectContaining({
        id: "project-revision-000001",
        projectId: harness.source.id,
        reason: "restore",
        sequence: 1,
      }),
    ]);
    expect(harness.events.map((event) => event.type)).toEqual(["ProjectSoftDeleted", "ProjectRestored"]);
  });

  it("leaves the project outside trash and publishes nothing when soft-delete commit fails", async () => {
    const failing: StorageTransactionCoordinator = { run: async () => unavailable("commit failed") };
    const harness = await createHarness("trash-failure", failing);

    const result = await harness.service.softDelete(harness.source.id);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(await value(harness.projects.getById(harness.source.id))).toEqual({ ...harness.source, schemaVersion: 1 });
    expect(await value(harness.trash.list())).toEqual([]);
    expect(harness.service.getActiveProject()).toEqual(harness.source);
    expect(harness.events).toEqual([]);
  });

  it("changes nothing when the active project's pre-delete flush fails", async () => {
    let discarded = false;
    const autosave: ProjectAutosaveControl = {
      flush: async () => unavailable("delete flush failed"),
      discard: () => { discarded = true; },
    };
    const harness = await createHarness("trash-flush-failure", undefined, autosave);

    const result = await harness.service.softDelete(harness.source.id);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(await value(harness.projects.getById(harness.source.id))).toEqual({ ...harness.source, schemaVersion: 1 });
    expect(await value(harness.trash.list())).toEqual([]);
    expect((await value(harness.settings.getByKey("global")))?.activeProjectId).toBe(harness.source.id);
    expect(harness.service.getActiveProject()).toEqual(harness.source);
    expect(discarded).toBe(false);
    expect(harness.events).toEqual([]);
  });

  it("cancels active-project autosave work after delete so no timer can resurrect it", async () => {
    const harness = await createHarness("trash-no-resurrection", undefined, "real");
    harness.autosave!.schedule({ ...harness.source, state: { prompt: "pending-delete" } });
    expect(harness.scheduler!.hasPending).toBe(true);

    const result = await harness.service.softDelete(harness.source.id);

    expect(result.ok).toBe(true);
    expect(harness.scheduler!.hasPending).toBe(false);
    await harness.scheduler!.run();
    expect(await value(harness.projects.getById(harness.source.id))).toBeNull();
  });

  it("does not overwrite an existing trash record when the generated trash id collides", async () => {
    const harness = await createHarness("trash-id-collision");
    const collision = {
      id: "trash-entry-000001",
      schemaVersion: 1 as const,
      createdAt: "2026-08-11T09:00:00.000Z",
      updatedAt: "2026-08-11T09:00:00.000Z",
      revision: 0,
      originalStore: "Projects" as const,
      entityType: "project",
      originalId: "protected-project",
      payload: { protected: true },
      deletedAt: "2026-08-11T09:00:00.000Z",
      restoreMetadata: {},
    };
    await value(harness.trash.put(collision));

    const result = await harness.service.softDelete(harness.source.id);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(await value(harness.trash.getById(collision.id))).toEqual(collision);
    expect(await value(harness.projects.getById(harness.source.id))).toEqual({ ...harness.source, schemaVersion: 1 });
    expect(harness.service.getActiveProject()).toEqual(harness.source);
    expect(harness.events).toEqual([]);
  });

  it("does not overwrite an existing revision when the restore revision id collides", async () => {
    const harness = await createHarness("restore-revision-collision");
    const deleted = await harness.service.softDelete(harness.source.id);
    expect(deleted.ok).toBe(true);
    harness.events.length = 0;
    const collision = revisionRecord("project-revision-000001", "protected-project");
    await value(harness.revisions.put(collision));

    const result = await harness.service.restore("trash-entry-000001");

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(await value(harness.revisions.getById(collision.id))).toEqual(collision);
    expect(await value(harness.projects.getById(harness.source.id))).toBeNull();
    expect(await value(harness.trash.getById("trash-entry-000001"))).not.toBeNull();
    expect(harness.events).toEqual([]);
  });
});

async function createHarness(
  suffix: string,
  transactionsOverride?: StorageTransactionCoordinator,
  autosaveOption?: ProjectAutosaveControl | "real",
) {
  const factory = new IDBFactory();
  const name = `prompt-studio-v600-task10-trash-${suffix}`;
  const adapter = new IndexedDbAdapter({ factory, databaseName: name });
  resources.push({ factory, adapter, name });
  const projects = new IndexedDbProjectRepository(adapter);
  const revisions = new IndexedDbProjectRevisionRepository(adapter);
  const settings = new IndexedDbSettingsRepository(adapter);
  const trash = new IndexedDbTrashRepository(adapter);
  const source = entityFromRecord(projectRecord());
  await value(projects.put({ ...source, schemaVersion: 1 }));
  await value(settings.put(settingsRecord(source.id)));
  const runtime = createFixedRuntime({ now: "2026-08-11T12:00:00.000Z" }).runtime;
  const transactions = transactionsOverride ?? new IndexedDbTransactionRunner(adapter);
  const scheduler = autosaveOption === "real" ? new ManualScheduler() : null;
  const autosave = autosaveOption === "real"
    ? new AutosaveService({
        runtime,
        projects,
        revisions,
        transactions,
        scheduler: scheduler!,
        initialConfirmedProject: source,
      })
    : null;
  const events: Array<{ type: string }> = [];
  const publisher: ProjectEventPublisher = { publish: async (event) => { events.push(event); } };
  const service = new ProjectService({
    runtime,
    projects,
    revisions,
    settings,
    trash,
    transactions,
    publisher,
    initialActiveProject: source,
    autosave: autosave ?? autosaveOption,
  });
  return { autosave, events, projects, revisions, scheduler, service, settings, source, trash };
}

class ManualScheduler implements AutosaveScheduler {
  private callback: (() => void | Promise<void>) | null = null;
  public get hasPending(): boolean { return this.callback !== null; }
  schedule(callback: () => void | Promise<void>, _delayMilliseconds: number): object {
    this.callback = callback;
    return {};
  }
  cancel(_handle: object): void { this.callback = null; }
  async run(): Promise<void> {
    const callback = this.callback;
    this.callback = null;
    if (callback !== null) await callback();
  }
}

function projectRecord(): ProjectRecord {
  return {
    id: "source-project",
    schemaVersion: 1,
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
    revision: 3,
    name: "Source",
    state: { prompt: "source", assetIds: ["asset-1", "asset-2"] },
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: ["tag-1"],
  };
}

function entityFromRecord(record: ProjectRecord): Project {
  const { schemaVersion: _schemaVersion, ...project } = record;
  return project;
}

function settingsRecord(activeProjectId: string): SettingsRecord {
  return {
    id: "settings-global",
    schemaVersion: 1,
    createdAt: "2026-08-11T09:00:00.000Z",
    updatedAt: "2026-08-11T09:00:00.000Z",
    revision: 1,
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

function revisionRecord(id: string, projectId: string) {
  return {
    id,
    schemaVersion: 1 as const,
    createdAt: "2026-08-11T09:00:00.000Z",
    updatedAt: "2026-08-11T09:00:00.000Z",
    revision: 0,
    projectId,
    sequence: 1,
    reason: "created" as const,
    parentRevisionId: null,
    snapshot: { name: "Protected" },
    sha256: "protected-hash",
  };
}

function unavailable(message: string): Result<never, StorageError> {
  return { ok: false, error: { code: "storage/unavailable", moduleId: "storage", severity: "error", userMessage: message, technicalMessage: message, recoverable: true } };
}

async function value<T>(promise: Promise<Result<T, StorageError>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.technicalMessage}`);
  return result.value;
}
