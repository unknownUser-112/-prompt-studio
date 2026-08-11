import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = "src";
const BROWSER_RUNTIME_DIRECTORY = "src/infrastructure/runtime";
const FORBIDDEN_RUNTIME_ACCESS = [
  /new\s+Date\s*\(/u,
  /Date\.now\s*\(/u,
  /performance\.now\s*\(/u,
  /crypto\.randomUUID\s*\(/u,
  /crypto\.getRandomValues\s*\(/u,
  /crypto\.subtle\b/u,
  /Math\.random\s*\(/u,
  /navigator\.language\b/u,
  /Intl\.DateTimeFormat\s*\([^)]*\)\.resolvedOptions\s*\(\)\.timeZone/u,
] as const;

describe("runtime access contract", () => {
  it("keeps direct browser runtime access inside the browser runtime adapter", async () => {
    const sourceFiles = await listTypeScriptFiles(SOURCE_ROOT);
    const violations: string[] = [];

    for (const path of sourceFiles) {
      if (path.startsWith(`${BROWSER_RUNTIME_DIRECTORY}/`)) continue;

      const source = await readFile(path, "utf8");
      for (const forbiddenAccess of FORBIDDEN_RUNTIME_ACCESS) {
        if (forbiddenAccess.test(source)) {
          violations.push(`${relative(SOURCE_ROOT, path)}: ${forbiddenAccess}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

async function listTypeScriptFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return listTypeScriptFiles(path);
      return extname(path) === ".ts" ? [path] : [];
    }),
  );

  return paths.flat();
}
