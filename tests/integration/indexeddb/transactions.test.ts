import { IDBFactory } from "fake-indexeddb";
import { describe, it } from "vitest";

import { runAtomicTransactionProbe } from "../../helpers/indexeddb-harness";

describe("IndexedDB multi-store transactions", () => {
  it("rolls back every store when an operation returns a failure", async () => {
    await runAtomicTransactionProbe(
      new IDBFactory(),
      "prompt-studio-v600-task10-fake-rollback",
    );
  });
});
