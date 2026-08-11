import type { Result } from "../../src/contracts/core/result";
import type { ProjectRecord } from "../../src/contracts/storage/records/project";
import type { StorageError } from "../../src/contracts/storage/storage-errors";
import { IndexedDbAdapter } from "../../src/infrastructure/indexeddb/indexeddb-adapter";
import { mapIndexedDbError } from "../../src/infrastructure/indexeddb/error-mapper";
import { IndexedDbTransactionRunner } from "../../src/infrastructure/indexeddb/transaction-runner";
import { IndexedDbCharacterRepository } from "../../src/infrastructure/indexeddb/repositories/character-repository";
import { IndexedDbGenerationHistoryRepository } from "../../src/infrastructure/indexeddb/repositories/generation-history-repository";
import { IndexedDbImageAssetRepository } from "../../src/infrastructure/indexeddb/repositories/image-asset-repository";
import { IndexedDbOutfitRepository } from "../../src/infrastructure/indexeddb/repositories/outfit-repository";
import { IndexedDbProfileRepository } from "../../src/infrastructure/indexeddb/repositories/profile-repository";
import { IndexedDbProjectRepository } from "../../src/infrastructure/indexeddb/repositories/project-repository";
import { IndexedDbProjectRevisionRepository } from "../../src/infrastructure/indexeddb/repositories/project-revision-repository";
import { IndexedDbPromptTemplateRepository } from "../../src/infrastructure/indexeddb/repositories/prompt-template-repository";
import { IndexedDbSceneRepository } from "../../src/infrastructure/indexeddb/repositories/scene-repository";
import { IndexedDbSettingsRepository } from "../../src/infrastructure/indexeddb/repositories/settings-repository";
import { IndexedDbSyncQueueRepository } from "../../src/infrastructure/indexeddb/repositories/sync-queue-repository";
import { IndexedDbTagRepository } from "../../src/infrastructure/indexeddb/repositories/tag-repository";
import { IndexedDbTrashRepository } from "../../src/infrastructure/indexeddb/repositories/trash-repository";

const TEST_DATABASE_PREFIX = "prompt-studio-v600-task10-";
const CREATED_AT = "2026-08-11T08:00:00.000Z";
const UPDATED_AT = "2026-08-11T08:01:00.000Z";

export interface RepositorySuiteResult {
  readonly checks: readonly string[];
}

export async function runRepositoryContractSuite(
  factory: IDBFactory,
  databaseName: string,
): Promise<RepositorySuiteResult> {
  assertTestDatabaseName(databaseName);
  await deleteTestDatabase(factory, databaseName);

  const adapter = new IndexedDbAdapter({ factory, databaseName });
  const transactions = new IndexedDbTransactionRunner(adapter);
  const projects = new IndexedDbProjectRepository(adapter);
  const revisions = new IndexedDbProjectRevisionRepository(adapter);
  const profiles = new IndexedDbProfileRepository(adapter);
  const characters = new IndexedDbCharacterRepository(adapter);
  const outfits = new IndexedDbOutfitRepository(adapter);
  const scenes = new IndexedDbSceneRepository(adapter);
  const templates = new IndexedDbPromptTemplateRepository(adapter);
  const generations = new IndexedDbGenerationHistoryRepository(adapter);
  const images = new IndexedDbImageAssetRepository(adapter);
  const tags = new IndexedDbTagRepository(adapter);
  const settings = new IndexedDbSettingsRepository(adapter);
  const trash = new IndexedDbTrashRepository(adapter);
  const syncQueue = new IndexedDbSyncQueueRepository(adapter);
  const checks: string[] = [];

  try {
    const project = projectRecord("project-1");
    await expectOk(projects.put(project), "Projects put");
    assertDeepEqual(await expectValue(projects.getById(project.id), "Projects get"), project, "Projects get value");
    assertDeepEqual(await expectValue(projects.list(), "Projects list"), [project], "Projects list value");
    await expectOk(projects.delete(project.id), "Projects delete");
    assertEqual(await expectValue(projects.getById(project.id), "Projects deleted get"), null, "Projects deleted value");
    checks.push("Projects CRUD");

    const revision = {
      ...metadata("revision-1"),
      projectId: "project-1",
      sequence: 1,
      reason: "created" as const,
      parentRevisionId: null,
      snapshot: { prompt: "first" },
      sha256: "revision-hash",
    };
    await expectOk(revisions.put(revision), "ProjectRevisions put");
    assertDeepEqual(await expectValue(revisions.getById(revision.id), "ProjectRevisions get"), revision, "ProjectRevisions get value");
    assertDeepEqual(await expectValue(revisions.listByProjectId("project-1"), "ProjectRevisions project index"), [revision], "ProjectRevisions project index value");
    await expectOk(revisions.delete(revision.id), "ProjectRevisions delete");
    checks.push("ProjectRevisions CRUD and project index");

    const profile = {
      ...metadata("profile-1"),
      kind: "custom" as const,
      name: "Portrait",
      strategyId: "portrait",
      strategyVersion: "1",
      configuration: { language: "de" },
    };
    await exerciseListRepository("Profiles", profiles, profile, profile.id);
    checks.push("Profiles CRUD");

    const character = libraryRecord("character-1", "Ada");
    await exerciseListRepository("Characters", characters, character, character.id);
    checks.push("Characters CRUD");

    const outfit = libraryRecord("outfit-1", "Black coat");
    await exerciseListRepository("Outfits", outfits, outfit, outfit.id);
    checks.push("Outfits CRUD");

    const scene = libraryRecord("scene-1", "Studio");
    await exerciseListRepository("Scenes", scenes, scene, scene.id);
    checks.push("Scenes CRUD");

    const template = libraryRecord("template-1", "Editorial");
    await exerciseListRepository("PromptTemplates", templates, template, template.id);
    checks.push("PromptTemplates CRUD");

    const generation = {
      ...metadata("generation-1"),
      projectId: "project-history",
      profileId: "profile-1",
      promptResult: { prompt: "portrait" },
      resolvedStateHash: "state-hash",
      diagnosticSummary: { warnings: 0 },
    };
    await expectOk(generations.put(generation), "GenerationHistory put");
    assertDeepEqual(await expectValue(generations.getById(generation.id), "GenerationHistory get"), generation, "GenerationHistory get value");
    assertDeepEqual(await expectValue(generations.listByProjectId("project-history"), "GenerationHistory project index"), [generation], "GenerationHistory project index value");
    await expectOk(generations.delete(generation.id), "GenerationHistory delete");
    checks.push("GenerationHistory CRUD and project index");

    const image = {
      ...metadata("image-1"),
      blob: new Blob(["asset"], { type: "image/png" }),
      mimeType: "image/png",
      width: 640,
      height: 480,
      sha256: "image-hash",
      referencedEntityIds: ["project-1"],
    };
    await expectOk(images.put(image), "ImageAssets put");
    assertBlobRecord(await expectValue(images.getById(image.id), "ImageAssets get"), image, "ImageAssets get value");
    assertBlobRecord(await expectValue(images.getBySha256("image-hash"), "ImageAssets hash index"), image, "ImageAssets hash index value");
    await expectOk(images.delete(image.id), "ImageAssets delete");
    checks.push("ImageAssets CRUD and sha256 index");

    const tag = { ...metadata("tag-1"), slug: "portrait", name: "Portrait", color: "#222222" };
    await expectOk(tags.put(tag), "Tags put");
    assertDeepEqual(await expectValue(tags.getById(tag.id), "Tags get"), tag, "Tags get value");
    assertDeepEqual(await expectValue(tags.getBySlug(tag.slug), "Tags slug index"), tag, "Tags slug index value");
    assertDeepEqual(await expectValue(tags.list(), "Tags list"), [tag], "Tags list value");
    checks.push("Tags CRUD and slug index");

    const settingsRecord = {
      ...metadata("settings-record-1"),
      key: "global",
      scope: "global" as const,
      projectId: null,
      featureFlags: {
        characterLibrary: true,
        outfitLibrary: true,
        sceneLibrary: true,
        promptLibrary: true,
        imageLibrary: true,
        revisionHistoryUi: false,
        cloudSync: false as const,
        aiKnowledgeBase: false as const,
      },
      activeProjectId: null,
      migrationLedger: [],
    };
    await expectOk(settings.put(settingsRecord), "Settings put");
    assertDeepEqual(await expectValue(settings.getByKey(settingsRecord.key), "Settings get"), settingsRecord, "Settings get value");
    assertDeepEqual(await expectValue(settings.list(), "Settings list"), [settingsRecord], "Settings list value");
    await expectOk(settings.delete(settingsRecord.key), "Settings delete");
    checks.push("Settings CRUD");

    const trashRecord = {
      ...metadata("trash-1"),
      originalStore: "Projects" as const,
      entityType: "project",
      originalId: "project-deleted",
      payload: { name: "Deleted" },
      deletedAt: UPDATED_AT,
      restoreMetadata: { source: "user" },
    };
    await exerciseListRepository("Trash", trash, trashRecord, trashRecord.id);
    checks.push("Trash CRUD");

    const syncRecord = {
      ...metadata("sync-1"),
      entityType: "project",
      entityId: "project-1",
      operation: "update" as const,
      baseRevision: 1,
      payload: { name: "Updated" },
      payloadHash: "payload-hash",
      status: "pending" as const,
    };
    await expectOk(syncQueue.put(syncRecord), "SyncQueue put");
    assertDeepEqual(await expectValue(syncQueue.getById(syncRecord.id), "SyncQueue get"), syncRecord, "SyncQueue get value");
    assertDeepEqual(await expectValue(syncQueue.listPending(), "SyncQueue status index"), [syncRecord], "SyncQueue status index value");
    await expectOk(syncQueue.delete(syncRecord.id), "SyncQueue delete");
    checks.push("SyncQueue CRUD and status index");

    const conflictingTag = { ...metadata("tag-2"), slug: tag.slug, name: "Duplicate", color: null };
    const constraintResult = await tags.put(conflictingTag);
    assertErrorCode(constraintResult, "storage/constraint", "unique tag slug");
    assertNotDomException(constraintResult.error, "constraint boundary");
    checks.push("ConstraintError mapping");

    const transactionProject = projectRecord("transaction-project");
    const rollbackResult = await transactions.run(
      { stores: ["Projects", "Tags"], mode: "readwrite" },
      async (transaction) => {
        const projectPut = await projects.put(transactionProject, transaction);
        if (!projectPut.ok) return projectPut;
        return tags.put({ ...metadata("tag-3"), slug: tag.slug, name: "Duplicate in transaction", color: null }, transaction);
      },
    );
    assertErrorCode(rollbackResult, "storage/constraint", "transaction constraint");
    assertEqual(await expectValue(projects.getById(transactionProject.id), "rolled back project get"), null, "transaction rollback removed partial write");
    checks.push("atomic multi-store rollback");

    const quotaError = mapIndexedDbError(createNamedError("QuotaExceededError", "quota details"), "ImageAssets");
    assertEqual(quotaError.code, "storage/quota-exceeded", "quota mapping");
    assertNotDomException(quotaError, "quota boundary");
    checks.push("QuotaError mapping");

    adapter.close();
    assertDeepEqual(await expectValue(tags.getById(tag.id), "reopen after close"), tag, "closed connection reopens safely");
    checks.push("closed connection recovery");

    adapter.close();
    await writeRawRecord(factory, databaseName, "Projects", {
      ...projectRecord("invalid-project"),
      schemaVersion: 99,
    });
    const invalidResult = await projects.getById("invalid-project");
    assertErrorCode(invalidResult, "storage/invalid-record", "invalid persisted record");
    checks.push("invalid record boundary");

    adapter.close();
    await upgradeDatabase(factory, databaseName, 2);
    const oldVersionAdapter = new IndexedDbAdapter({ factory, databaseName, version: 1 });
    const versionResult = await oldVersionAdapter.open();
    assertErrorCode(versionResult, "storage/unavailable", "VersionError mapping");
    assertNotDomException(versionResult.error, "version boundary");
    checks.push("VersionError mapping");

    return { checks };
  } finally {
    adapter.close();
    await deleteTestDatabase(factory, databaseName);
  }
}

export async function runAtomicTransactionProbe(
  factory: IDBFactory,
  databaseName: string,
): Promise<void> {
  assertTestDatabaseName(databaseName);
  await deleteTestDatabase(factory, databaseName);
  const adapter = new IndexedDbAdapter({ factory, databaseName });
  const runner = new IndexedDbTransactionRunner(adapter);
  const projects = new IndexedDbProjectRepository(adapter);
  const tags = new IndexedDbTagRepository(adapter);

  try {
    const outcome = await runner.run(
      { stores: ["Projects", "Tags"], mode: "readwrite" },
      async (transaction) => {
        const first = await projects.put(projectRecord("probe-project"), transaction);
        if (!first.ok) return first;
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const second = await tags.put({ ...metadata("probe-tag"), slug: "probe", name: "Probe", color: null }, transaction);
        if (!second.ok) return second;
        return { ok: false, error: mapIndexedDbError(createNamedError("AbortError", "forced rollback")) };
      },
    );
    assertErrorCode(outcome, "storage/transaction-aborted", "explicit failed operation");
    assertEqual(await expectValue(projects.getById("probe-project"), "probe project"), null, "probe project rollback");
    assertEqual(await expectValue(tags.getById("probe-tag"), "probe tag"), null, "probe tag rollback");
  } finally {
    adapter.close();
    await deleteTestDatabase(factory, databaseName);
  }
}

async function exerciseListRepository<T extends { readonly id: string }>(
  label: string,
  repository: {
    put(record: T): Promise<Result<void, StorageError>>;
    getById(id: string): Promise<Result<T | null, StorageError>>;
    list(): Promise<Result<readonly T[], StorageError>>;
    delete(id: string): Promise<Result<void, StorageError>>;
  },
  record: T,
  id: string,
): Promise<void> {
  await expectOk(repository.put(record), `${label} put`);
  assertDeepEqual(await expectValue(repository.getById(id), `${label} get`), record, `${label} get value`);
  assertDeepEqual(await expectValue(repository.list(), `${label} list`), [record], `${label} list value`);
  await expectOk(repository.delete(id), `${label} delete`);
  assertEqual(await expectValue(repository.getById(id), `${label} deleted get`), null, `${label} deleted value`);
}

function metadata(id: string) {
  return {
    id,
    schemaVersion: 1 as const,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    revision: 0,
  };
}

function projectRecord(id: string): ProjectRecord {
  return {
    ...metadata(id),
    name: `Project ${id}`,
    state: { prompt: "portrait" },
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [],
  };
}

function libraryRecord(id: string, name: string) {
  return {
    ...metadata(id),
    name,
    payload: { enabled: true },
    tagIds: [],
    sourceProjectId: null,
  };
}

async function expectOk<T>(promise: Promise<Result<T, StorageError>>, label: string): Promise<T> {
  return expectValue(promise, label);
}

async function expectValue<T>(promise: Promise<Result<T, StorageError>>, label: string): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(`${label}: ${result.error.code} ${result.error.technicalMessage}`);
  return result.value;
}

function assertErrorCode<T>(
  result: Result<T, StorageError>,
  expected: StorageError["code"],
  label: string,
): asserts result is { readonly ok: false; readonly error: StorageError } {
  if (result.ok) throw new Error(`${label}: expected ${expected}, received success`);
  assertEqual(result.error.code, expected, label);
}

function assertNotDomException(value: unknown, label: string): void {
  if (typeof DOMException !== "undefined" && value instanceof DOMException) {
    throw new Error(`${label}: native DOMException crossed the infrastructure boundary`);
  }
}

function assertBlobRecord(
  actual: { readonly blob: Blob; readonly [key: string]: unknown } | null,
  expected: { readonly blob: Blob; readonly [key: string]: unknown },
  label: string,
): void {
  if (actual === null) throw new Error(`${label}: expected a record`);
  assertEqual(actual.blob.size, expected.blob.size, `${label} blob size`);
  assertEqual(actual.blob.type, expected.blob.type, `${label} blob type`);
  const { blob: _actualBlob, ...actualRest } = actual;
  const { blob: _expectedBlob, ...expectedRest } = expected;
  assertDeepEqual(actualRest, expectedRest, `${label} metadata`);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, label: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label}: expected ${expectedJson}, received ${actualJson}`);
  }
}

function createNamedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

async function upgradeDatabase(factory: IDBFactory, databaseName: string, version: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = factory.open(databaseName, version);
    request.onerror = () => reject(request.error ?? new Error("Database upgrade failed"));
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
  });
}

async function writeRawRecord(
  factory: IDBFactory,
  databaseName: string,
  storeName: string,
  value: unknown,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const openRequest = factory.open(databaseName, 1);
    openRequest.onerror = () => reject(openRequest.error ?? new Error("Raw database open failed"));
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const transaction = database.transaction(storeName, "readwrite");
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error("Raw record transaction aborted"));
      };
      transaction.onerror = () => undefined;
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.objectStore(storeName).put(value);
    };
  });
}

export async function deleteTestDatabase(factory: IDBFactory, databaseName: string): Promise<void> {
  assertTestDatabaseName(databaseName);
  await new Promise<void>((resolve, reject) => {
    const request = factory.deleteDatabase(databaseName);
    request.onerror = () => reject(request.error ?? new Error("Test database deletion failed"));
    request.onblocked = () => reject(new Error(`Test database deletion blocked: ${databaseName}`));
    request.onsuccess = () => resolve();
  });
}

function assertTestDatabaseName(databaseName: string): void {
  if (!databaseName.startsWith(TEST_DATABASE_PREFIX)) {
    throw new Error(`Refusing to access non-test database: ${databaseName}`);
  }
}
