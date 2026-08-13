import { readdir, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const FORBIDDEN_DIRECT_RULE_LOCATIONS = [
  "src/profiles",
  "src/renderers",
  "src/ui",
];

describe("single rule source contract", () => {
  it("keeps only declarative type-only domain contracts outside the constraint engine", async () => {
    const sources = await Promise.all([
      readFile("src/domain/contracts/constraints/rule.ts", "utf8"),
      readFile("src/domain/contracts/constraints/provider.ts", "utf8"),
      readFile("src/domain/contracts/resolved-state/resolved-state.ts", "utf8"),
    ]);

    expect(sources.join("\n")).not.toMatch(/from\s+["'][^"']*(?:engines|application|infrastructure)[^"']*["']/u);
  });

  it("rejects direct constraint rule declarations in profiles, renderers and UI", async () => {
    const sources = await Promise.all(
      (await Promise.all(FORBIDDEN_DIRECT_RULE_LOCATIONS.map(listTypeScriptSources))).flat().map((path) => readFile(path, "utf8")),
    );

    expect(sources.join("\n")).not.toMatch(/\b(?:ConstraintRule|ConstraintProvider|conflictStrategy)\b/u);
  });

  it("uses locale-independent code-unit ordering in the Task-13 source files", async () => {
    const sources = await Promise.all([
      readFile("src/domain/engines/constraint-engine.ts", "utf8"),
      readFile("src/domain/engines/resolved-state-builder.ts", "utf8"),
      readFile("src/domain/engines/resolution-trace.ts", "utf8"),
    ]);

    expect(sources.join("\n")).not.toContain("localeCompare");
  });
});

async function listTypeScriptSources(directory: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(directory, { recursive: true });
    return entries
      .filter((entry) => entry.endsWith(".ts"))
      .map((entry) => `${directory}/${entry}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
