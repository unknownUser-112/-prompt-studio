import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import { AutosaveService, type AutosaveFlushTrigger, type AutosaveScheduler } from "../../../src/application/services/autosave-service";
import type { Result } from "../../../src/contracts/core/result";
import type { ProjectRecord } from "../../../src/contracts/storage/records/project";
import type { StorageError } from "../../../src/contracts/storage/storage-errors";
import type { StorageTransactionCoordinator } from "../../../src/contracts/storage/transaction";
import type { Project } from "../../../src/domain/entities/project";
import { IndexedDbAdapter } from "../../../src/infrastructure/indexeddb/indexeddb-adapter";
import { IndexedDbProjectRepository } from "../../../src/infrastructure/indexeddb/repositories/project-repository";
import { IndexedDbProjectRevisionRepository } from "../../../src/infrastructure/indexeddb/repositories/project-revision-repository";
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

describe("autosave and recovery", () => {
  it("debounces changes for exactly 750 ms before persisting", async () => {
    const scheduler = new ManualScheduler();
    const harness = await createHarness("debounce", scheduler);
    const changed = { ...harness.initial, state: { prompt: "changed" } };

    harness.autosave.schedule(changed);

    expect(scheduler.delay).toBe(750);
    expect((await value(harness.projects.getById(changed.id)))?.state).toEqual({ prompt: "confirmed" });
    await scheduler.run();
    expect((await value(harness.projects.getById(changed.id)))?.state).toEqual({ prompt: "changed" });
  });

  it.each(["navigation", "import", "export", "visibilitychange", "stop"] as const)(
    "flushes pending state through the shared %s trigger contract",
    async (trigger) => {
      const harness = await createHarness(`flush-${trigger}`, new ManualScheduler());
      harness.autosave.schedule({ ...harness.initial, state: { prompt: trigger } });

      const result = await harness.autosave.flush(trigger);

      expect(result).toMatchObject({ ok: true, value: { state: { prompt: trigger } } });
      expect((await value(harness.projects.getById(harness.initial.id)))?.state).toEqual({ prompt: trigger });
    },
  );

  it("creates an autosave revision no later than five minutes of active changes", async () => {
    const fixed = createFixedRuntime({ monotonicNowMilliseconds: 0 });
    const harness = await createHarness("five-minutes", new ManualScheduler(), fixed);
    harness.autosave.schedule({ ...harness.initial, state: { prompt: "first" } });
    fixed.advanceMonotonicMilliseconds(299_999);

    await harness.autosave.flush("navigation");
    expect(await value(harness.revisions.listByProjectId(harness.initial.id))).toEqual([]);

    const confirmed = harness.autosave.getRecoveryState().confirmed;
    expect(confirmed).not.toBeNull();
    harness.autosave.schedule({ ...confirmed!, state: { prompt: "second" } });
    fixed.advanceMonotonicMilliseconds(1);
    await harness.autosave.flush("export");

    const revisions = await value(harness.revisions.listByProjectId(harness.initial.id));
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({
      id: "project-revision-000001",
      projectId: harness.initial.id,
      reason: "autosave",
      sequence: 1,
    });
    expect((await value(harness.projects.getById(harness.initial.id)))?.currentRevisionId).toBe("project-revision-000001");
  });

  it("caps a continuously reset debounce at the exact five-minute revision deadline", async () => {
    const scheduler = new ManualScheduler();
    const fixed = createFixedRuntime({ monotonicNowMilliseconds: 0 });
    const harness = await createHarness("continuous-five-minutes", scheduler, fixed);
    harness.autosave.schedule({ ...harness.initial, state: { prompt: "first" } });
    fixed.advanceMonotonicMilliseconds(299_500);

    harness.autosave.schedule({ ...harness.initial, state: { prompt: "continuous" } });

    expect(scheduler.delay).toBe(500);
    fixed.advanceMonotonicMilliseconds(500);
    await scheduler.run();
    expect(await value(harness.revisions.listByProjectId(harness.initial.id))).toEqual([
      expect.objectContaining({ reason: "autosave", projectId: harness.initial.id }),
    ]);
  });

  it("keeps the last confirmed recovery state when a flush transaction fails", async () => {
    const failing: StorageTransactionCoordinator = { run: async () => unavailable("write failed") };
    const harness = await createHarness("failed-recovery", new ManualScheduler(), createFixedRuntime(), failing);
    const pending = { ...harness.initial, state: { prompt: "unconfirmed" } };
    harness.autosave.schedule(pending);

    const result = await harness.autosave.flush("visibilitychange");

    expect(result).toMatchObject({ ok: false, error: { code: "storage/unavailable" } });
    expect(harness.autosave.getRecoveryState()).toEqual({
      confirmed: harness.initial,
      pending,
    });
    expect((await value(harness.projects.getById(harness.initial.id)))?.state).toEqual({ prompt: "confirmed" });
  });

  it("keeps a newer pending generation and timer when it arrives during an in-flight flush", async () => {
    const scheduler = new ManualScheduler();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    let delegate!: StorageTransactionCoordinator;
    let blockFirst = true;
    const blocking: StorageTransactionCoordinator = {
      run: async (options, operation) => {
        if (blockFirst) {
          blockFirst = false;
          entered();
          await gate;
        }
        return delegate.run(options, operation);
      },
    };
    const harness = await createHarness("in-flight-generation", scheduler, createFixedRuntime(), blocking);
    delegate = harness.runner;
    const first = { ...harness.initial, state: { prompt: "A1" } };
    const second = { ...harness.initial, state: { prompt: "A2" } };
    harness.autosave.schedule(first);

    const firstFlush = harness.autosave.flush("navigation");
    await started;
    harness.autosave.schedule(second);
    release();
    await firstFlush;

    expect(harness.autosave.getRecoveryState()).toMatchObject({
      confirmed: { state: { prompt: "A1" } },
      pending: { state: { prompt: "A2" } },
    });
    expect(scheduler.hasPending).toBe(true);
    await scheduler.run();
    expect((await value(harness.projects.getById(harness.initial.id)))?.state).toEqual({ prompt: "A2" });
    expect(harness.autosave.getRecoveryState().pending).toBeNull();
  });

  it("does not overwrite an existing revision when the autosave revision id collides", async () => {
    const fixed = createFixedRuntime({ monotonicNowMilliseconds: 0 });
    const harness = await createHarness("revision-id-collision", new ManualScheduler(), fixed);
    const collision = {
      id: "project-revision-000001",
      schemaVersion: 1 as const,
      createdAt: "2026-08-11T09:00:00.000Z",
      updatedAt: "2026-08-11T09:00:00.000Z",
      revision: 0,
      projectId: "protected-project",
      sequence: 1,
      reason: "created" as const,
      parentRevisionId: null,
      snapshot: { name: "Protected" },
      sha256: "protected-hash",
    };
    await value(harness.revisions.put(collision));
    const pending = { ...harness.initial, state: { prompt: "collision" } };
    harness.autosave.schedule(pending);
    fixed.advanceMonotonicMilliseconds(300_000);

    const result = await harness.autosave.flush("navigation");

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(await value(harness.revisions.getById(collision.id))).toEqual(collision);
    expect((await value(harness.projects.getById(harness.initial.id)))?.state).toEqual({ prompt: "confirmed" });
    expect(harness.autosave.getRecoveryState()).toEqual({ confirmed: harness.initial, pending });
  });
});

class ManualScheduler implements AutosaveScheduler {
  delay: number | null = null;
  private callback: (() => void | Promise<void>) | null = null;
  get hasPending(): boolean { return this.callback !== null; }

  schedule(callback: () => void | Promise<void>, delayMilliseconds: number): object {
    this.callback = callback;
    this.delay = delayMilliseconds;
    return {};
  }

  cancel(_handle: object): void { this.callback = null; }

  async run(): Promise<void> {
    const callback = this.callback;
    this.callback = null;
    if (callback !== null) await callback();
  }
}

async function createHarness(
  suffix: string,
  scheduler: AutosaveScheduler,
  fixed = createFixedRuntime(),
  overrideTransactions?: StorageTransactionCoordinator,
) {
  const factory = new IDBFactory();
  const name = `prompt-studio-v600-task10-autosave-${suffix}`;
  const adapter = new IndexedDbAdapter({ factory, databaseName: name });
  resources.push({ factory, adapter, name });
  const projects = new IndexedDbProjectRepository(adapter);
  const revisions = new IndexedDbProjectRevisionRepository(adapter);
  const runner = new IndexedDbTransactionRunner(adapter);
  const initial = entityFromRecord(projectRecord());
  await value(projects.put({ ...initial, schemaVersion: 1 }));
  const autosave = new AutosaveService({
    runtime: fixed.runtime,
    projects,
    revisions,
    transactions: overrideTransactions ?? runner,
    scheduler,
    initialConfirmedProject: initial,
  });
  return { autosave, initial, projects, revisions, runner };
}

function projectRecord(): ProjectRecord {
  return {
    id: "project-autosave",
    schemaVersion: 1,
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
    revision: 0,
    name: "Autosave",
    state: { prompt: "confirmed" },
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [],
  };
}

function entityFromRecord(record: ProjectRecord): Project {
  const { schemaVersion: _schemaVersion, ...project } = record;
  return project;
}

function unavailable(message: string): Result<never, StorageError> {
  return { ok: false, error: { code: "storage/unavailable", moduleId: "storage", severity: "error", userMessage: message, technicalMessage: message, recoverable: true } };
}

async function value<T>(promise: Promise<Result<T, StorageError>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.technicalMessage}`);
  return result.value;
}
