import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import { CreateNewProjectCommandHandler, createNewProjectCommand } from "../../../src/application/commands/project-commands";
import { ProjectService, type ProjectEventPublisher } from "../../../src/application/services/project-service";
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

describe("serialized CreateNewProjectCommand", () => {
  it("leaves storage and active state unchanged when confirmation is cancelled", async () => {
    const harness = await createHarness("cancel");
    let flushes = 0;
    const handler = new CreateNewProjectCommandHandler(harness.service, {
      flush: async () => { flushes += 1; return ok(null); },
    });

    const result = await handler.handle(createNewProjectCommand({ confirmed: false }));

    expect(result).toEqual(ok(null));
    expect(flushes).toBe(0);
    expect(await value(harness.projects.list())).toEqual([harness.oldRecord]);
    expect(harness.service.getActiveProject()?.id).toBe(harness.oldRecord.id);
    expect(harness.events).toEqual([]);
  });

  it("does not create, switch, or publish when the pending autosave flush fails", async () => {
    const harness = await createHarness("flush-failure");
    const handler = new CreateNewProjectCommandHandler(harness.service, {
      flush: async (trigger) => {
        expect(trigger).toBe("project-switch");
        return unavailable("flush failed");
      },
    });

    const result = await handler.handle(createNewProjectCommand({ confirmed: true }));

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(await value(harness.projects.list())).toEqual([harness.oldRecord]);
    expect(harness.service.getActiveProject()?.id).toBe(harness.oldRecord.id);
    expect(harness.events).toEqual([]);
  });

  it("flushes first, atomically commits a clean project, created revision and active settings, then switches and publishes", async () => {
    const order: string[] = [];
    const harness = await createHarness("success", order);
    const handler = new CreateNewProjectCommandHandler(harness.service, {
      flush: async () => { order.push("flush"); return ok(harness.oldProject); },
    });

    const result = await handler.handle(createNewProjectCommand({ confirmed: true, name: "Fresh" }));

    expect(result).toMatchObject({ ok: true, value: { id: "project-000001", name: "Fresh" } });
    const records = await value(harness.projects.list());
    expect(records).toHaveLength(2);
    expect(records.find((record) => record.id === harness.oldRecord.id)).toEqual(harness.oldRecord);
    const created = records.find((record) => record.id === "project-000001");
    expect(created).toMatchObject({
      id: "project-000001",
      currentRevisionId: "project-revision-000001",
      state: {
        schemaVersion: 3,
        wizardStep: 1,
        values: { camera: { framing: "framing.whole_person" } },
        assetIds: [],
      },
    });
    expect(JSON.stringify(created)).not.toContain("old-secret");
    const revisions = await value(harness.revisions.listByProjectId("project-000001"));
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({
      id: "project-revision-000001",
      projectId: "project-000001",
      reason: "created",
      sequence: 1,
      parentRevisionId: null,
    });
    expect((await value(harness.settings.getByKey("global")))?.activeProjectId).toBe("project-000001");
    expect(harness.service.getActiveProject()?.id).toBe("project-000001");
    expect(harness.events.map((event) => event.type)).toEqual(["ProjectCreated", "ActiveProjectChanged"]);
    expect(order).toEqual(["flush", "commit", "ProjectCreated", "ActiveProjectChanged"]);
  });

  it("retains the old active project and publishes nothing when commit fails", async () => {
    const harness = await createHarness("commit-failure", [], async () => unavailable("commit failed"));
    const handler = new CreateNewProjectCommandHandler(harness.service, { flush: async () => ok(harness.oldProject) });

    const result = await handler.handle(createNewProjectCommand({ confirmed: true }));

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(await value(harness.projects.list())).toEqual([harness.oldRecord]);
    expect(harness.service.getActiveProject()?.id).toBe(harness.oldRecord.id);
    expect(harness.events).toEqual([]);
  });

  it("coalesces concurrent double activation into one project and one initial revision", async () => {
    const harness = await createHarness("double");
    let releaseFlush!: () => void;
    const flushGate = new Promise<void>((resolve) => { releaseFlush = resolve; });
    const handler = new CreateNewProjectCommandHandler(harness.service, {
      flush: async () => { await flushGate; return ok(harness.oldProject); },
    });
    const command = createNewProjectCommand({ confirmed: true });

    const first = handler.handle(command);
    const second = handler.handle(command);
    releaseFlush();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(secondResult).toEqual(firstResult);
    expect(await value(harness.projects.list())).toHaveLength(2);
    expect(await value(harness.revisions.listByProjectId("project-000001"))).toHaveLength(1);
    expect(harness.events.map((event) => event.type)).toEqual(["ProjectCreated", "ActiveProjectChanged"]);
  });

  it("never overwrites an existing project when the injected id collides", async () => {
    const harness = await createHarness("id-collision");
    const collision = { ...harness.oldRecord, id: "project-000001", name: "Must survive" };
    await value(harness.projects.put(collision));
    const handler = new CreateNewProjectCommandHandler(harness.service, { flush: async () => ok(harness.oldProject) });

    const result = await handler.handle(createNewProjectCommand({ confirmed: true }));

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(await value(harness.projects.getById(collision.id))).toEqual(collision);
    expect(await value(harness.revisions.listByProjectId(collision.id))).toEqual([]);
    expect(harness.service.getActiveProject()).toEqual(harness.oldProject);
    expect(harness.events).toEqual([]);
  });

  it("does not overwrite an existing revision when the created revision id collides", async () => {
    const harness = await createHarness("revision-id-collision");
    const collision = revisionRecord("project-revision-000001", "protected-project");
    await value(harness.revisions.put(collision));
    const handler = new CreateNewProjectCommandHandler(harness.service, { flush: async () => ok(harness.oldProject) });

    const result = await handler.handle(createNewProjectCommand({ confirmed: true }));

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(await value(harness.revisions.getById(collision.id))).toEqual(collision);
    expect(await value(harness.projects.getById("project-000001"))).toBeNull();
    expect((await value(harness.settings.getByKey("global")))?.activeProjectId).toBe(harness.oldProject.id);
    expect(harness.events).toEqual([]);
  });

  it("returns stable unavailable storage without losing the in-memory active project", async () => {
    const fixed = createFixedRuntime();
    const adapter = new IndexedDbAdapter({ factory: undefined });
    const oldProject = entityFromRecord(projectRecord());
    const events: Array<{ type: string }> = [];
    const service = new ProjectService({
      runtime: fixed.runtime,
      projects: new IndexedDbProjectRepository(adapter),
      revisions: new IndexedDbProjectRevisionRepository(adapter),
      settings: new IndexedDbSettingsRepository(adapter),
      trash: new IndexedDbTrashRepository(adapter),
      transactions: new IndexedDbTransactionRunner(adapter),
      publisher: { publish: async (event) => { events.push(event); } },
      initialActiveProject: oldProject,
    });
    const handler = new CreateNewProjectCommandHandler(service, { flush: async () => ok(oldProject) });

    const result = await handler.handle(createNewProjectCommand({ confirmed: true }));

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable", recoverable: true } });
    expect(service.getActiveProject()).toEqual(oldProject);
    expect(events).toEqual([]);
  });

  it("flushes and commits active settings before load switches projects and publishes", async () => {
    const order: string[] = [];
    const autosave = {
      flush: async () => { order.push("flush"); return ok(null); },
      discard: () => undefined,
    };
    const harness = await createHarness("load-success", order, undefined, autosave);
    const target = { ...harness.oldRecord, id: "target-project", name: "Target" };
    await value(harness.projects.put(target));

    const result = await harness.service.load(target.id);

    expect(result).toMatchObject({ ok: true, value: { id: target.id } });
    expect((await value(harness.settings.getByKey("global")))?.activeProjectId).toBe(target.id);
    expect(harness.service.getActiveProject()?.id).toBe(target.id);
    expect(order).toEqual(["flush", "commit", "ActiveProjectChanged"]);
  });

  it("atomically upgrades a loaded V1 project once before returning it", async () => {
    const harness = await createHarness("load-v1");
    const target = {
      ...harness.oldRecord,
      id: "target-v1",
      name: "V1 Target",
      state: {
        schemaVersion: 1,
        wizardStep: 4,
        values: { camera: { device: "user camera" }, custom: { nested: "kept" } },
        assetIds: ["user-asset"],
      },
    };
    await value(harness.projects.put(target));

    const first = await harness.service.load(target.id);
    const persistedAfterFirst = await value(harness.projects.getById(target.id));
    const second = await harness.service.load(target.id);

    expect(first).toMatchObject({
      ok: true,
      value: {
        state: {
          schemaVersion: 3,
          wizardStep: 4,
          values: {
            camera: { device: "user camera", framing: "framing.whole_person" },
            custom: { nested: "kept" },
          },
          assetIds: ["user-asset"],
        },
      },
    });
    expect(second).toMatchObject({ ok: true, value: { state: { schemaVersion: 3 } } });
    expect(await value(harness.projects.getById(target.id))).toEqual(persistedAfterFirst);
  });

  it("atomically upgrades a V2 project with user style values to V3", async () => {
    const harness = await createHarness("load-v2");
    const target = {
      ...harness.oldRecord,
      id: "target-v2",
      state: {
        schemaVersion: 2,
        values: { model: { behaviour: "modelBehaviour.user" }, custom: "kept" },
      },
    };
    await value(harness.projects.put(target));

    const result = await harness.service.load(target.id);

    expect(result).toMatchObject({
      ok: true,
      value: {
        state: {
          schemaVersion: 3,
          values: {
            model: { behaviour: "modelBehaviour.user" },
            realism: { reference: "realism.reference" },
            custom: "kept",
          },
        },
      },
    });
    expect(await value(harness.projects.getById(target.id))).toMatchObject({ state: { schemaVersion: 3 } });
  });

  it("keeps the previous project active when a load flush fails", async () => {
    const autosave = {
      flush: async () => unavailable("load flush failed"),
      discard: () => undefined,
    };
    const harness = await createHarness("load-flush-failure", [], undefined, autosave);
    const target = { ...harness.oldRecord, id: "target-project", name: "Target" };
    await value(harness.projects.put(target));

    const result = await harness.service.load(target.id);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(harness.service.getActiveProject()).toEqual(harness.oldProject);
    expect((await value(harness.settings.getByKey("global")))?.activeProjectId).toBe(harness.oldProject.id);
    expect(harness.events).toEqual([]);
  });

  it("keeps the previous project active when a load settings commit fails", async () => {
    const autosave = { flush: async () => ok(null), discard: () => undefined };
    const harness = await createHarness(
      "load-commit-failure",
      [],
      async () => unavailable("load commit failed"),
      autosave,
    );
    const target = {
      ...harness.oldRecord,
      id: "target-project",
      name: "Target",
      state: { schemaVersion: 1, values: { custom: "confirmed-v1" } },
    };
    await value(harness.projects.put(target));

    const result = await harness.service.load(target.id);

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(await value(harness.projects.getById(target.id))).toEqual(target);
    expect(harness.service.getActiveProject()).toEqual(harness.oldProject);
    expect((await value(harness.settings.getByKey("global")))?.activeProjectId).toBe(harness.oldProject.id);
    expect(harness.events).toEqual([]);
  });

  it("serializes concurrent load project switches", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let calls = 0;
    let activeFlushes = 0;
    let maximumActiveFlushes = 0;
    const autosave = {
      flush: async () => {
        calls += 1;
        activeFlushes += 1;
        maximumActiveFlushes = Math.max(maximumActiveFlushes, activeFlushes);
        if (calls === 1) await firstGate;
        activeFlushes -= 1;
        return ok(null);
      },
      discard: () => undefined,
    };
    const harness = await createHarness("load-serialized", [], undefined, autosave);
    const targetB = { ...harness.oldRecord, id: "target-b", name: "B" };
    const targetC = { ...harness.oldRecord, id: "target-c", name: "C" };
    await value(harness.projects.put(targetB));
    await value(harness.projects.put(targetC));

    const first = harness.service.load(targetB.id);
    const second = harness.service.load(targetC.id);
    await Promise.resolve();
    releaseFirst();
    await Promise.all([first, second]);

    expect(maximumActiveFlushes).toBe(1);
    expect(harness.service.getActiveProject()?.id).toBe(targetC.id);
    expect((await value(harness.settings.getByKey("global")))?.activeProjectId).toBe(targetC.id);
    expect(harness.events.map((event) => event.type)).toEqual(["ActiveProjectChanged", "ActiveProjectChanged"]);
  });
});

async function createHarness(
  suffix: string,
  order: string[] = [],
  overrideRun?: StorageTransactionCoordinator["run"],
  projectAutosave?: {
    flush(trigger: "project-switch"): Promise<Result<unknown, StorageError>>;
    discard(projectId: string): void;
  },
) {
  const factory = new IDBFactory();
  const name = `prompt-studio-v600-task10-create-${suffix}`;
  const adapter = new IndexedDbAdapter({ factory, databaseName: name });
  resources.push({ factory, adapter, name });
  const projects = new IndexedDbProjectRepository(adapter);
  const revisions = new IndexedDbProjectRevisionRepository(adapter);
  const settings = new IndexedDbSettingsRepository(adapter);
  const trash = new IndexedDbTrashRepository(adapter);
  const runner = new IndexedDbTransactionRunner(adapter);
  const transactions: StorageTransactionCoordinator = overrideRun === undefined
    ? { run: async (options, operation) => {
        const result = await runner.run(options, operation);
        if (result.ok) order.push("commit");
        return result;
      } }
    : { run: overrideRun };
  const oldRecord = projectRecord();
  const oldProject = entityFromRecord(oldRecord);
  await value(projects.put(oldRecord));
  await value(settings.put(settingsRecord(oldRecord.id)));
  const events: Array<{ type: string; payload: Readonly<Record<string, unknown>> }> = [];
  const publisher: ProjectEventPublisher = {
    publish: async (event) => { events.push(event); order.push(event.type); },
  };
  const service = new ProjectService({
    runtime: createFixedRuntime({ now: "2026-08-11T12:00:00.000Z" }).runtime,
    projects,
    revisions,
    settings,
    trash,
    transactions,
    publisher,
    initialActiveProject: oldProject,
    autosave: projectAutosave,
  });
  return { events, oldProject, oldRecord, projects, revisions, service, settings };
}

function projectRecord(): ProjectRecord {
  return {
    id: "old-project",
    schemaVersion: 1,
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
    revision: 4,
    name: "Old",
    state: { prompt: "old-secret", assetIds: ["asset-old"] },
    currentRevisionId: "old-revision",
    autosavedAt: "2026-08-11T10:01:00.000Z",
    lifecycleStatus: "active",
    tagIds: ["tag-old"],
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

function ok<T>(value: T): Result<T, StorageError> { return { ok: true, value }; }
function unavailable(message: string): Result<never, StorageError> {
  return { ok: false, error: { code: "storage/unavailable", moduleId: "storage", severity: "error", userMessage: message, technicalMessage: message, recoverable: true } };
}
async function value<T>(promise: Promise<Result<T, StorageError>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.technicalMessage}`);
  return result.value;
}
