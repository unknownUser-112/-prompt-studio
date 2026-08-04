import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];
const OUTPUT_FILE = resolve("dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html");

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("V500.6.11 reference debt contract", () => {
  it("classifies only the approved V500.6.11 integrity defects as baseline debt", async () => {
    const result = await runNode("scripts/verify-source-integrity.mjs", ["--baseline"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("REFERENCE_VERSION_METADATA_STALE");
    expect(result.stdout).toContain("REFERENCE_EXPORT_FILENAME_STALE");
    expect(result.stdout).toContain("REFERENCE_DUPLICATE_RENDERED_IDS");
    expect(result.stdout).toContain("REFERENCE_REAL_MOBILE_COVERAGE_MISSING");
    expect(result.stdout).toContain("SOURCE_INTEGRITY_BASELINE_OK");
  });

  it("rejects the approved reference defects when they appear in a V600 artifact", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "Prompt-Studio-V600.0.0-Phase1-Foundation.html");
    const reportPath = resolve(
      "reference/v500.6.11/Prompt-Studio-V500.6.11-Test-Results.json",
    );
    await writeFile(
      artifactPath,
      v600Artifact({
        appVersion: "V500.6.10",
        body: '<main id="prompt"></main><aside id="prompt"></aside>',
        script: "anchor.download='prompt-studio-v500-6-10-project.json'",
      }),
      "utf8",
    );

    const result = await runNode("scripts/verify-source-integrity.mjs", [
      "--artifact",
      artifactPath,
      "--report",
      reportPath,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_STALE");
    expect(result.stderr).toContain("V600_DUPLICATE_RENDERED_IDS");
    expect(result.stderr).toContain("V600_REAL_MOBILE_COVERAGE_MISSING");
  });

  it("rejects unused exports and open implementation markers in V600 sources", async () => {
    const directory = await createTemporaryDirectory();
    const sourceRoot = join(directory, "src");
    const artifactPath = join(directory, "Prompt-Studio-V600.0.0-Phase1-Foundation.html");
    const reportPath = join(directory, "v600-report.json");
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(
      join(sourceRoot, "unused.ts"),
      "// TODO: wire this later\nexport function unusedCapability(): string { return 'unused'; }\n",
      "utf8",
    );
    await writeFile(artifactPath, v600Artifact({}), "utf8");
    await writeFile(
      reportPath,
      JSON.stringify({
        browserEnvironmentNote: "A real iPhone HTML Viewer interaction was executed successfully.",
      }),
      "utf8",
    );

    const result = await runNode("scripts/verify-source-integrity.mjs", [
      "--artifact",
      artifactPath,
      "--report",
      reportPath,
      "--source-root",
      sourceRoot,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_UNUSED_EXPORT");
    expect(result.stderr).toContain("V600_OPEN_MARKER");
  });
});

describe("V600 module graph contract", () => {
  it("accepts the current bootstrap-only esbuild graph", async () => {
    const result = await runNode("scripts/verify-module-boundaries.mjs", ["--bootstrap-only"]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("MODULE_BOUNDARIES_OK");
  });

  it("rejects a forbidden domain-to-infrastructure edge from an esbuild metafile", async () => {
    const metafilePath = await writeMetafile({
      "src/domain/engines/prompt.ts": ["src/infrastructure/storage.ts"],
      "src/infrastructure/storage.ts": [],
    });

    const result = await runNode("scripts/verify-module-boundaries.mjs", [
      "--bootstrap-only",
      "--metafile",
      metafilePath,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MODULE_BOUNDARY_FORBIDDEN_IMPORT");
  });

  it("rejects cycles reported by the esbuild module graph", async () => {
    const metafilePath = await writeMetafile({
      "src/contracts/core/a.ts": ["src/contracts/core/b.ts"],
      "src/contracts/core/b.ts": ["src/contracts/core/a.ts"],
    });

    const result = await runNode("scripts/verify-module-boundaries.mjs", [
      "--bootstrap-only",
      "--metafile",
      metafilePath,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MODULE_CYCLE_DETECTED");
  });
});

describe("V600 CSP contract", () => {
  it("accepts the final production policy", async () => {
    const result = await runNode("scripts/verify-csp.mjs", [OUTPUT_FILE]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("CSP_OK");
  });

  it("rejects a parsed policy containing a network target", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "network-enabled.html");
    await writeFile(
      artifactPath,
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src https://api.example.test; font-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'; worker-src blob:">',
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_NETWORK_SOURCE_FORBIDDEN");
  });
});

interface CommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

async function runNode(scriptPath: string, arguments_: readonly string[]): Promise<CommandResult> {
  try {
    const result = await execFileAsync(process.execPath, [scriptPath, ...arguments_]);
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error: unknown) {
    if (!isExecutionError(error)) {
      throw error;
    }

    return {
      exitCode: typeof error.code === "number" ? error.code : 1,
      stdout: typeof error.stdout === "string" ? error.stdout : "",
      stderr: typeof error.stderr === "string" ? error.stderr : String(error),
    };
  }
}

function isExecutionError(
  error: unknown,
): error is Error & { readonly code?: number | string; readonly stdout?: string; readonly stderr?: string } {
  return error instanceof Error;
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "prompt-studio-v600-task4-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeMetafile(
  graph: Readonly<Record<string, readonly string[]>>,
): Promise<string> {
  const directory = await createTemporaryDirectory();
  const metafilePath = join(directory, "meta.json");
  const inputs = Object.fromEntries(
    Object.entries(graph).map(([inputPath, imports]) => [
      inputPath,
      {
        bytes: 1,
        imports: imports.map((importPath) => ({
          external: false,
          kind: "import-statement",
          original: importPath,
          path: importPath,
        })),
      },
    ]),
  );
  await writeFile(metafilePath, JSON.stringify({ inputs, outputs: {} }), "utf8");
  return metafilePath;
}

function v600Artifact(
  overrides: {
    readonly appVersion?: string;
    readonly body?: string;
    readonly script?: string;
  },
): string {
  const appVersion = overrides.appVersion ?? "V600.0.0-Phase1-Foundation";
  const body = overrides.body ?? '<main id="app">Prompt Studio V600</main>';
  const script = overrides.script ?? "const ready=true";

  return `<!doctype html><html><head><title>Prompt Studio V600</title><script id="prompt-studio-build-metadata" type="application/json">${JSON.stringify({ appVersion })}</script></head><body>${body}<script>${script}</script></body></html>`;
}
