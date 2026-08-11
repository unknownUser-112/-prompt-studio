import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("composition root contract", () => {
  it("keeps AppCore free of concrete infrastructure imports and construction", async () => {
    const source = await readFile("src/core/app-core.ts", "utf8");

    expect(source).not.toMatch(/from\s+["'][^"']*infrastructure\//u);
    expect(source).not.toMatch(/new\s+(?:BrowserRuntime|IndexedDb|LocalStorage|Plugin|Repository)\b/u);
  });
});
