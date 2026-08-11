import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import { runRepositoryContractSuite } from "../../helpers/indexeddb-harness";

describe("IndexedDB repository contract", () => {
  it("runs the same CRUD, index, isolation, and error suite used by real browsers", async () => {
    const result = await runRepositoryContractSuite(
      new IDBFactory(),
      "prompt-studio-v600-task10-fake-repositories",
    );

    expect(result.checks).toHaveLength(19);
  });
});
