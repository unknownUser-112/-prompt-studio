import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import type { ProjectRevisionRecord } from "../../../src/contracts/storage/records/project-revision";
import { IndexedDbAdapter } from "../../../src/infrastructure/indexeddb/indexeddb-adapter";
import { IndexedDbProjectRevisionRepository } from "../../../src/infrastructure/indexeddb/repositories/project-revision-repository";
import { deleteTestDatabase, runRepositoryContractSuite } from "../../helpers/indexeddb-harness";

describe("IndexedDB repository contract", () => {
  it("runs the same CRUD, index, isolation, and error suite used by real browsers", async () => {
    const result = await runRepositoryContractSuite(
      new IDBFactory(),
      "prompt-studio-v600-task10-fake-repositories",
    );

    expect(result.checks).toHaveLength(19);
  });

  it.each(["duplicate", "restore", "milestone"] as const)(
    "persists project revisions with the %s reason",
    async (reason) => {
      const factory = new IDBFactory();
      const databaseName = `prompt-studio-v600-task10-revision-${reason}`;
      const adapter = new IndexedDbAdapter({ factory, databaseName });
      const revisions = new IndexedDbProjectRevisionRepository(adapter);
      const record: ProjectRevisionRecord = {
        id: `revision-${reason}`,
        schemaVersion: 1,
        createdAt: "2026-08-11T08:00:00.000Z",
        updatedAt: "2026-08-11T08:00:00.000Z",
        revision: 0,
        projectId: "project-1",
        sequence: 2,
        reason,
        parentRevisionId: "revision-created",
        snapshot: { prompt: "portrait" },
        sha256: `hash-${reason}`,
      };

      try {
        expect(await revisions.put(record)).toEqual({ ok: true, value: undefined });
        expect(await revisions.getById(record.id)).toEqual({ ok: true, value: record });
      } finally {
        adapter.close();
        await deleteTestDatabase(factory, databaseName);
      }
    },
  );

  it("rejects an unknown project revision reason with the stable invalid-record error", async () => {
    const factory = new IDBFactory();
    const databaseName = "prompt-studio-v600-task10-revision-unknown";
    const adapter = new IndexedDbAdapter({ factory, databaseName });
    const revisions = new IndexedDbProjectRevisionRepository(adapter);
    const invalidRecord = {
      id: "revision-unknown",
      schemaVersion: 1,
      createdAt: "2026-08-11T08:00:00.000Z",
      updatedAt: "2026-08-11T08:00:00.000Z",
      revision: 0,
      projectId: "project-1",
      sequence: 2,
      reason: "unknown",
      parentRevisionId: "revision-created",
      snapshot: { prompt: "portrait" },
      sha256: "hash-unknown",
    } as unknown as ProjectRevisionRecord;

    try {
      expect(await revisions.put(invalidRecord)).toMatchObject({
        ok: false,
        error: {
          code: "storage/invalid-record",
          moduleId: "storage",
          recoverable: false,
        },
      });
    } finally {
      adapter.close();
      await deleteTestDatabase(factory, databaseName);
    }
  });
});
