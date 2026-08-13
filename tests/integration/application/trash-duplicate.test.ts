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

  it("upgrades a V1 source before duplicating its complete V3 state", async () => {
    const harness = await createHarness("duplicate-v1");
    const v1 = {
      ...projectRecord(),
      id: "v1-source",
      state: {
        schemaVersion: 1,
        values: { garment: { upper: "user upper" }, custom: "kept" },
        assetIds: ["asset-v1"],
      },
    };
    await value(harness.projects.put(v1));

    const result = await harness.service.duplicate(v1.id);

    expect(result).toMatchObject({
      ok: true,
      value: {
        id: "project-000001",
        state: {
          schemaVersion: 3,
          values: {
            garment: {
              upper: "user upper",
              lower: { kind: "lowerGarment.high_waist_jeans" },
            },
            custom: "kept",
          },
          assetIds: ["asset-v1"],
        },
      },
    });
    expect(await value(harness.projects.getById(v1.id))).toMatchObject({ state: { schemaVersion: 3 } });
    const revision = (await value(harness.revisions.listByProjectId("project-000001")))[0];
    expect(revision).toMatchObject({ reason: "duplicate", snapshot: { state: { schemaVersion: 3 } } });
  });

  it("upgrades a V2 source before creating its V3 duplicate and duplicate revision", async () => {
    const harness = await createHarness("duplicate-v2");
    const v2 = {
      ...projectRecord(),
      id: "v2-source",
      state: {
        schemaVersion: 2,
        values: { realism: { reference: "realism.user" }, custom: "kept" },
      },
    };
    await value(harness.projects.put(v2));

    const result = await harness.service.duplicate(v2.id);

    expect(result).toMatchObject({
      ok: true,
      value: {
        state: {
          schemaVersion: 3,
          values: {
            model: { behaviour: "modelBehaviour.authentic_lifestyle" },
            realism: { reference: "realism.user" },
            custom: "kept",
          },
        },
      },
    });
    const revisions = await value(harness.revisions.listByProjectId("project-000001"));
    expect(revisions[0]).toMatchObject({ reason: "duplicate", snapshot: { state: { schemaVersion: 3 } } });
  });

  it("synchronizes the active V1 source after its successful duplicate transaction upgrades it", async () => {
    const harness = await createHarness("duplicate-active-v1");
    const activeV1 = {
      ...projectRecord(),
      state: { schemaVersion: 1, values: { camera: { device: "device.user_camera" } } },
    };
    await value(harness.projects.put(activeV1));

    const result = await harness.service.duplicate(activeV1.id);

    expect(result.ok).toBe(true);
    expect(harness.service.getActiveProject()).toMatchObject({
      id: activeV1.id,
      state: {
        schemaVersion: 3,
        values: { camera: { device: "device.user_camera", framing: "framing.whole_person" } },
      },
    });
  });

  it("keeps the active V1 source unchanged when its duplicate transaction fails", async () => {
    const harness = await createHarness(
      "duplicate-active-v1-failure",
      { run: async () => unavailable("duplicate commit failed") },
    );

    const result = await harness.service.duplicate(harness.source.id);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(harness.service.getActiveProject()).toEqual(harness.source);
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

  it("restores a V1 trash payload only as a current V3 project and V3 restore revision", async () => {
    const harness = await createHarness("trash-v1-restore");
    const v1Project = {
      ...projectRecord(),
      id: "trashed-v1",
      state: { schemaVersion: 1, values: { scene: { location: "user place" } } },
    };
    await value(harness.trash.put({
      id: "trash-v1",
      schemaVersion: 1,
      createdAt: "2026-08-11T10:00:00.000Z",
      updatedAt: "2026-08-11T10:00:00.000Z",
      revision: 0,
      originalStore: "Projects",
      entityType: "project",
      originalId: v1Project.id,
      payload: v1Project,
      deletedAt: "2026-08-11T10:00:00.000Z",
      restoreMetadata: {},
    }));

    const restored = await harness.service.restore("trash-v1");

    expect(restored).toMatchObject({
      ok: true,
      value: {
        id: "trashed-v1",
        state: {
          schemaVersion: 3,
          values: {
            scene: { location: "user place", area: "locationArea.apartment.modern_living_room_window" },
          },
        },
      },
    });
    const revisions = await value(harness.revisions.listByProjectId("trashed-v1"));
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ reason: "restore", snapshot: { state: { schemaVersion: 3 } } });
  });

  it("restores a V2 trash payload as V3 without changing the stored historical payload", async () => {
    const harness = await createHarness("trash-v2-restore");
    const v2Project = {
      ...projectRecord(),
      id: "trashed-v2",
      state: { schemaVersion: 2, values: { model: { behaviour: "modelBehaviour.user" } } },
    };
    const trashRecord = {
      id: "trash-v2",
      schemaVersion: 1 as const,
      createdAt: "2026-08-11T10:00:00.000Z",
      updatedAt: "2026-08-11T10:00:00.000Z",
      revision: 0,
      originalStore: "Projects" as const,
      entityType: "project",
      originalId: v2Project.id,
      payload: v2Project,
      deletedAt: "2026-08-11T10:00:00.000Z",
      restoreMetadata: {},
    };
    await value(harness.trash.put(trashRecord));
    const before = JSON.stringify(await value(harness.trash.getById(trashRecord.id)));

    const restored = await harness.service.restore(trashRecord.id);

    expect(restored).toMatchObject({
      ok: true,
      value: {
        state: {
          schemaVersion: 3,
          values: {
            model: { behaviour: "modelBehaviour.user" },
            realism: { reference: "realism.reference" },
          },
        },
      },
    });
    expect(JSON.stringify(trashRecord)).toBe(before);
  });

  it("restores a historical V1 revision into a new current V3 revision without changing history", async () => {
    const harness = await createHarness("revision-v1-restore");
    const historical = {
      id: "historical-v1",
      schemaVersion: 1 as const,
      createdAt: "2026-08-10T09:00:00.000Z",
      updatedAt: "2026-08-10T09:00:00.000Z",
      revision: 0,
      projectId: harness.source.id,
      sequence: 5,
      reason: "manual-save" as const,
      parentRevisionId: null,
      snapshot: {
        name: "Historical name",
        state: { schemaVersion: 1, values: { character: { age: 37 } }, assetIds: ["historic"] },
        lifecycleStatus: "active",
        tagIds: ["historic-tag"],
      },
      sha256: "historical-v1-hash",
    };
    await value(harness.revisions.put(historical));
    const before = JSON.stringify(await value(harness.revisions.getById(historical.id)));

    const result = await harness.service.restoreRevision(historical.id);

    expect(result).toMatchObject({
      ok: true,
      value: {
        name: "Historical name",
        state: {
          schemaVersion: 3,
          values: { character: { age: 37, gender: "gender.woman" } },
          assetIds: ["historic"],
        },
        tagIds: ["historic-tag"],
      },
    });
    expect(JSON.stringify(await value(harness.revisions.getById(historical.id)))).toBe(before);
    const revisions = await value(harness.revisions.listByProjectId(harness.source.id));
    expect(revisions).toHaveLength(2);
    expect(revisions.find((entry) => entry.reason === "restore")).toMatchObject({
      sequence: 6,
      parentRevisionId: historical.id,
      snapshot: { state: { schemaVersion: 3 } },
    });
  });

  it("restores an immutable historical V2 revision into a new current V3 revision", async () => {
    const harness = await createHarness("revision-v2-restore");
    const historical = {
      id: "historical-v2",
      schemaVersion: 1 as const,
      createdAt: "2026-08-10T09:00:00.000Z",
      updatedAt: "2026-08-10T09:00:00.000Z",
      revision: 0,
      projectId: harness.source.id,
      sequence: 3,
      reason: "manual-save" as const,
      parentRevisionId: null,
      snapshot: {
        name: "Historical V2",
        state: { schemaVersion: 2, values: { realism: { reference: "realism.user" } } },
        lifecycleStatus: "active" as const,
        tagIds: [],
      },
      sha256: "historical-v2-hash",
    };
    await value(harness.revisions.put(historical));
    const before = JSON.stringify(await value(harness.revisions.getById(historical.id)));

    const result = await harness.service.restoreRevision(historical.id);

    expect(result).toMatchObject({
      ok: true,
      value: {
        state: {
          schemaVersion: 3,
          values: {
            model: { behaviour: "modelBehaviour.authentic_lifestyle" },
            realism: { reference: "realism.user" },
          },
        },
      },
    });
    expect(JSON.stringify(await value(harness.revisions.getById(historical.id)))).toBe(before);
    expect((await value(harness.revisions.listByProjectId(harness.source.id))).find((entry) => entry.reason === "restore"))
      .toMatchObject({ snapshot: { state: { schemaVersion: 3 } } });
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
