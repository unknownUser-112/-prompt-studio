import { describe, expect, it } from "vitest";

import {
  createNewProjectCommand,
  duplicateProjectCommand,
  flushAutosaveCommand,
  restoreProjectCommand,
  softDeleteProjectCommand,
  updateProjectCommand,
} from "../../../src/application/commands/project-commands";
import {
  getActiveProjectQuery,
  listProjectsQuery,
  loadProjectQuery,
} from "../../../src/application/queries/project-queries";
import { ProjectService } from "../../../src/application/services/project-service";
import type { ProjectEventPublisher } from "../../../src/application/services/project-service";
import type { Result } from "../../../src/contracts/core/result";
import type { ProjectRepository } from "../../../src/contracts/storage/repositories/project";
import type { ProjectRevisionRepository } from "../../../src/contracts/storage/repositories/project-revision";
import type { SettingsRepository } from "../../../src/contracts/storage/repositories/settings";
import type { TrashRepository } from "../../../src/contracts/storage/repositories/trash";
import type { ProjectRevisionRecord } from "../../../src/contracts/storage/records/project-revision";
import type { ProjectRecord } from "../../../src/contracts/storage/records/project";
import type { SettingsRecord } from "../../../src/contracts/storage/records/settings";
import type { TrashRecord } from "../../../src/contracts/storage/records/trash";
import type { StorageError } from "../../../src/contracts/storage/storage-errors";
import type { StorageTransaction, StorageTransactionCoordinator } from "../../../src/contracts/storage/transaction";
import {
  createCanonicalProjectStateV4Values,
  createNewProject,
} from "../../../src/domain/entities/project-factory";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

describe("project application contracts", () => {
  it("creates a versioned default project only from injected runtime values", () => {
    const fixed = createFixedRuntime({ now: "2026-08-11T12:00:00.000Z" });

    const project = createNewProject(fixed.runtime, "Neues Projekt");

    expect(project).toEqual({
      id: "project-000001",
      createdAt: "2026-08-11T12:00:00.000Z",
      updatedAt: "2026-08-11T12:00:00.000Z",
      revision: 0,
      name: "Neues Projekt",
      state: {
        schemaVersion: 4,
        wizardStep: 1,
        values: createCanonicalProjectStateV4Values(),
        assetIds: [],
      },
      currentRevisionId: null,
      autosavedAt: null,
      lifecycleStatus: "active",
      tagIds: [],
    });
  });

  it("persists only editable baseline input facts in a new V2 project", () => {
    const project = createNewProject(createFixedRuntime().runtime);
    const values = project.state.values;

    expect(values).toMatchObject({
      camera: {
        framing: "framing.whole_person",
        device: "device.smartphone",
        lens: "lens.smart_main",
      },
      character: { gender: "gender.woman", age: 21, heightCentimeters: 160 },
      pose: { position: "pose.standing", gaze: "gaze.left_camera", expression: "expression.relaxed" },
      garment: {
        upper: { kind: "upperGarment.classic_tshirt", color: "color.white", material: "material.cotton" },
        lower: { kind: "lowerGarment.high_waist_jeans", color: "color.denim_blue", material: "material.denim" },
        footwear: { kind: "footwear.classic_sneakers", color: "color.white", material: "material.leather_textile" },
      },
      scene: { location: "location.apartment", area: "locationArea.apartment.modern_living_room_window" },
      lighting: { source: "lightSource.window", setup: "lighting.soft_side_window" },
      model: { behaviour: "modelBehaviour.authentic_lifestyle" },
      realism: { reference: "realism.reference" },
    });
  });

  it("loads and updates the addressed project without overwriting another project", async () => {
    const first = projectRecord("project-1", "First", { prompt: "one" });
    const second = projectRecord("project-2", "Second", { prompt: "two" });
    const harness = createHarness([first, second]);

    const loaded = await harness.service.load("project-1");
    expect(loaded).toMatchObject({ ok: true, value: { id: "project-1", name: "First" } });
    if (!loaded.ok) return;

    const updated = await harness.service.update({
      ...loaded.value,
      name: "First updated",
      state: { prompt: "changed" },
    });

    expect(updated).toMatchObject({ ok: true, value: { id: "project-1", revision: 1 } });
    expect(harness.projects.records.get("project-1")).toMatchObject({
      id: "project-1",
      name: "First updated",
      state: { prompt: "changed" },
    });
    expect(harness.projects.records.get("project-2")).toEqual(second);
  });

  it.each(["import", "migration", "milestone"] as const)(
    "appends a %s revision with the addressed project id",
    async (reason) => {
      const project = projectRecord("project-1", "First", { prompt: reason });
      const harness = createHarness([project]);

      const result = await harness.service.recordRevision(project.id, reason);

      expect(result).toMatchObject({
        ok: true,
        value: {
          projectId: "project-1",
          reason,
          sequence: 1,
        },
      });
      expect([...harness.revisions.records.values()]).toHaveLength(1);
      expect(harness.projects.records.get(project.id)?.currentRevisionId).toBe(
        `project-revision-000001`,
      );
    },
  );

  it("does not overwrite an existing revision when a recorded revision id collides", async () => {
    const project = projectRecord("project-1", "First", { prompt: "changed" });
    const harness = createHarness([project]);
    const collision: ProjectRevisionRecord = {
      id: "project-revision-000001",
      schemaVersion: 1,
      createdAt: "2026-08-11T09:00:00.000Z",
      updatedAt: "2026-08-11T09:00:00.000Z",
      revision: 0,
      projectId: "protected-project",
      sequence: 1,
      reason: "created",
      parentRevisionId: null,
      snapshot: { name: "Protected" },
      sha256: "protected-hash",
    };
    harness.revisions.records.set(collision.id, collision);

    const result = await harness.service.recordRevision(project.id, "milestone");

    expect(result).toMatchObject({ ok: false, error: { code: "storage/conflict" } });
    expect(harness.revisions.records.get(collision.id)).toEqual(collision);
    expect(harness.projects.records.get(project.id)?.currentRevisionId).toBeNull();
  });

  it("defines JSON-serializable project commands and queries without runtime references", () => {
    const messages = [
      createNewProjectCommand({ confirmed: true, name: "Studio" }),
      updateProjectCommand({ projectId: "project-1", name: "Changed", state: { prompt: "x" } }),
      duplicateProjectCommand({ projectId: "project-1" }),
      softDeleteProjectCommand({ projectId: "project-1" }),
      restoreProjectCommand({ trashEntryId: "trash-1" }),
      flushAutosaveCommand({ trigger: "navigation" }),
      getActiveProjectQuery(),
      loadProjectQuery({ projectId: "project-1" }),
      listProjectsQuery(),
    ];

    expect(JSON.parse(JSON.stringify(messages))).toEqual(messages);
  });
});

function createHarness(projectRecords: readonly ProjectRecord[]) {
  const fixed = createFixedRuntime({ now: "2026-08-11T12:00:00.000Z" });
  const projects = new MemoryProjectRepository(projectRecords);
  const revisions = new MemoryRevisionRepository();
  const settings = new MemorySettingsRepository();
  const trash = new MemoryTrashRepository();
  const transactions = new ImmediateTransactions();
  const publisher: ProjectEventPublisher = { publish: async () => undefined };
  const service = new ProjectService({
    runtime: fixed.runtime,
    projects,
    revisions,
    settings,
    trash,
    transactions,
    publisher,
  });
  return { projects, revisions, service };
}

class MemoryProjectRepository implements ProjectRepository {
  readonly records = new Map<string, ProjectRecord>();

  constructor(records: readonly ProjectRecord[]) {
    for (const record of records) this.records.set(record.id, record);
  }

  async getById(id: string) { return ok(this.records.get(id) ?? null); }
  async list() { return ok([...this.records.values()]); }
  async put(record: ProjectRecord) { this.records.set(record.id, record); return ok(undefined); }
  async delete(id: string) { this.records.delete(id); return ok(undefined); }
}

class MemoryRevisionRepository implements ProjectRevisionRepository {
  readonly records = new Map<string, ProjectRevisionRecord>();

  async getById(id: string) { return ok(this.records.get(id) ?? null); }
  async listByProjectId(projectId: string) {
    return ok([...this.records.values()].filter((record) => record.projectId === projectId));
  }
  async put(record: ProjectRevisionRecord) { this.records.set(record.id, record); return ok(undefined); }
  async delete(id: string) { this.records.delete(id); return ok(undefined); }
}

class MemorySettingsRepository implements SettingsRepository {
  private readonly global: SettingsRecord = {
    id: "settings-global",
    schemaVersion: 1,
    createdAt: "2026-08-11T09:00:00.000Z",
    updatedAt: "2026-08-11T09:00:00.000Z",
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
    activeProjectId: null,
    migrationLedger: [],
  };

  async getByKey(_key: string) { return ok<SettingsRecord | null>(this.global); }
  async list() { return ok<readonly SettingsRecord[]>([this.global]); }
  async put(_record: SettingsRecord) { return ok(undefined); }
  async delete(_key: string) { return ok(undefined); }
}

class MemoryTrashRepository implements TrashRepository {
  async getById(_id: string) { return ok<TrashRecord | null>(null); }
  async list() { return ok<readonly TrashRecord[]>([]); }
  async put(_record: TrashRecord) { return ok(undefined); }
  async delete(_id: string) { return ok(undefined); }
}

class ImmediateTransactions implements StorageTransactionCoordinator {
  async run<T>(
    _options: Parameters<StorageTransactionCoordinator["run"]>[0],
    operation: (transaction: StorageTransaction) => Promise<Result<T, StorageError>>,
  ): Promise<Result<T, StorageError>> {
    return operation({
      stores: [],
      mode: "readwrite",
      state: "active",
      commit: async () => ok(undefined),
      rollback: async () => ok(undefined),
    });
  }
}

function projectRecord(id: string, name: string, state: ProjectRecord["state"]): ProjectRecord {
  return {
    id,
    schemaVersion: 1,
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
    revision: 0,
    name,
    state,
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [],
  };
}

function ok<T>(value: T): Result<T, StorageError> {
  return { ok: true, value };
}
