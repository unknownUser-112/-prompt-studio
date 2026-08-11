import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const VALID_FIXTURE = "tests/fixtures/plugins/valid-prompt-provider.ts";
const INVALID_FIXTURE = "tests/fixtures/plugins/invalid-engine-import.ts";

describe("plugin import boundary", () => {
  it("allows PromptSectionProvider only as a type import and rejects engine imports", async () => {
    const [validFixture, invalidFixture] = await Promise.all([
      readFile(VALID_FIXTURE, "utf8"),
      readFile(INVALID_FIXTURE, "utf8"),
    ]);

    const invalidImports = [
      [VALID_FIXTURE, validFixture],
      [INVALID_FIXTURE, invalidFixture],
    ].flatMap(([path, source]) =>
      /import\s+(?!type\b)[\s\S]*from\s+["'][^"']*(?:core|engine)[^"']*["']/u.test(
        source,
      )
        ? [path]
        : [],
    );

    expect(validFixture).toMatch(
      /import\s+type\s+\{\s*PromptSectionProvider\s*\}\s+from\s+["'][^"']+["']/u,
    );
    expect(validFixture).not.toMatch(
      /import\s+(?!type\b)[\s\S]*PromptSectionProvider/u,
    );
    expect(invalidImports).toEqual([INVALID_FIXTURE]);
  });
});
