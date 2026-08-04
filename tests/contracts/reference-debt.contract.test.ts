import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];
const OUTPUT_FILE = resolve("dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html");
const COMPLETE_IPHONE_EVIDENCE = `# Phase 1 iPhone Viewer Verification

Status: PASS
Device Model: iPhone 15 Pro
iOS Version: 19.0.1
HTML Viewer Name: Offline HTML Viewer
HTML Viewer Version: 2.4.1

## Environment Results

- Safari: PASS
- HTML Viewer: PASS

## Interaction Results

- App Start: PASS
- Wizard Steps 1-10: PASS
- New Project Dialog: PASS
- Profiles: PASS
- Prompt Output: PASS
- Import: PASS
- Export: PASS
- Focus After Dialog Close: PASS

## Screenshot Evidence

- Safari: ![Safari verification](screenshots/safari-pass.png)
- HTML Viewer: ![HTML Viewer verification](screenshots/html-viewer-pass.png)
`;

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

  it("rejects a baseline missing the approved duplicate copy ID", async () => {
    const directory = await writeBaselineFixture(
      '<div id="prompt"></div><div id="prompt"></div><div id="copy"></div>',
    );

    const result = await runNode(
      "scripts/verify-source-integrity.mjs",
      ["--baseline"],
      directory,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("REFERENCE_DEBT_ID_SET_MISMATCH");
  });

  it("rejects an additional duplicate ID outside the approved baseline set", async () => {
    const directory = await writeBaselineFixture(
      '<div id="prompt"></div><div id="prompt"></div><div id="copy"></div><div id="copy"></div><div id="extra"></div><div id="extra"></div>',
    );

    const result = await runNode(
      "scripts/verify-source-integrity.mjs",
      ["--baseline"],
      directory,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("REFERENCE_DEBT_ID_SET_MISMATCH");
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
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
    expect(result.stderr).toContain("V600_DUPLICATE_RENDERED_IDS");
    expect(result.stderr).toContain("V600_IPHONE_EVIDENCE_INVALID");
  });

  it("rejects unused exports and open implementation markers in V600 sources", async () => {
    const directory = await createTemporaryDirectory();
    const sourceRoot = join(directory, "src");
    const artifactPath = join(directory, "Prompt-Studio-V600.0.0-Phase1-Foundation.html");
    const reportPath = join(directory, "v600-report.md");
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(
      join(sourceRoot, "unused.ts"),
      "// TODO: wire this later\nexport function unusedCapability(): string { return 'unused'; }\n",
      "utf8",
    );
    await writeFile(artifactPath, v600Artifact({}), "utf8");
    await writeFile(reportPath, COMPLETE_IPHONE_EVIDENCE, "utf8");

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

describe("V600 source integrity release contract", () => {
  it("reports invalid CLI arguments through the stable fatal envelope", async () => {
    const result = await runNode("scripts/verify-source-integrity.mjs", ["--unknown"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "SOURCE_INTEGRITY_FATAL: SOURCE_INTEGRITY_USAGE_INVALID",
    );
  });

  it("rejects release mode combined with path overrides", async () => {
    const result = await runNode("scripts/verify-source-integrity.mjs", [
      "--release",
      "--artifact",
      OUTPUT_FILE,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("SOURCE_INTEGRITY_USAGE_INVALID --release is exclusive");
  });

  it("uses the Task-22 release defaults in a complete temporary release tree", async () => {
    const directory = await writeReleaseFixture();

    const result = await runNode(
      "scripts/verify-source-integrity.mjs",
      ["--release"],
      directory,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_RELEASE_OK");
  });

  it("rejects iPhone evidence with a missing interaction result", async () => {
    const fixture = await writeV600AuditFixture({
      evidence: COMPLETE_IPHONE_EVIDENCE.replace("- Focus After Dialog Close: PASS\n", ""),
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_IPHONE_EVIDENCE_INVALID");
    expect(result.stderr).toContain("Focus After Dialog Close");
  });

  it("rejects minimally forged iPhone evidence", async () => {
    const fixture = await writeV600AuditFixture({
      evidence: COMPLETE_IPHONE_EVIDENCE
        .replace("Device Model: iPhone 15 Pro", "Device Model: iPhone Simulator")
        .replace(
          "- Safari: ![Safari verification](screenshots/safari-pass.png)",
          "- Safari: PASS",
        ),
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_IPHONE_EVIDENCE_INVALID");
    expect(result.stderr).toContain("Device Model");
    expect(result.stderr).toContain("Safari screenshot");
  });

  it("rejects an incorrect app version in build metadata", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: { appVersion: "V600.0.1-Phase1-Foundation" },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("rejects an incorrect database schema version in build metadata", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: { databaseSchemaVersion: 2 },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_DATABASE_SCHEMA_VERSION_INVALID");
  });

  it("rejects an incorrect plugin API version in build metadata", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: { pluginApiVersion: 2 },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_PLUGIN_API_VERSION_INVALID");
  });

  it("rejects every visible V500 version, not only V500.6.10", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: { body: '<main id="app">Prompt Studio V500.9.9</main>' },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("rejects visible V500 metadata in accessibility attributes", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: '<main id="app" aria-label="Prompt Studio V500.8.2">Prompt Studio V600</main>',
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("rejects a non-V600 static JSON export filename", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: { script: "anchor.download='wrong-release-project.json'" },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("rejects a static V500 JSON export filename", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: { script: "anchor.download='prompt-studio-v500-project.json'" },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("does not classify dynamic user-provided export names as static literals", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script:
          "anchor.download=userProvidedName; const template=`prompt-studio-${version}.json`",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("does not classify assignment-like text inside a string as an export filename", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script: String.raw`const documentation="anchor.download='wrong-release-project.json'"`,
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("rejects duplicate static literal IDs in V600", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: { body: '<main id="prompt"></main><aside id="prompt"></aside>' },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_DUPLICATE_RENDERED_IDS");
  });

  it("ignores repeated interpolated IDs because they are not static literals", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: { body: '<main id="${id}"></main><aside id="${id}"></aside>' },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("uses the TypeScript AST for import, re-export, namespace and dynamic-import usage", async () => {
    const fixture = await writeV600AuditFixture({
      sourceFiles: {
        "all-types.ts": "export interface AllType { readonly value: string }\n",
        "barrel.ts": [
          'export type { DirectType } from "./direct-type";',
          'export type * from "./all-types";',
          'export * as runtimeNamespace from "./runtime";',
          'export { ReExported } from "./re-exported";',
        ].join("\n"),
        "consumer.ts": [
          'import type { DirectType, AllType } from "./barrel";',
          'import { runtimeNamespace, ReExported } from "./barrel";',
          'import { Regular } from "./regular";',
          "void (null as DirectType | AllType | null);",
          "void runtimeNamespace; void ReExported; void Regular;",
          'void import("./dynamic");',
        ].join("\n"),
        "direct-type.ts": "export interface DirectType { readonly id: string }\n",
        "dynamic.ts": "export const Dynamic = true;\n",
        "re-exported.ts": "export const ReExported = true;\n",
        "regular.ts": "export const Regular = true;\n",
        "runtime.ts": "export const Runtime = true;\n",
        "unused.ts": "export abstract class UnusedService {}\n",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_UNUSED_EXPORT");
    expect(result.stderr).toContain("unused.ts#UnusedService");
    expect(result.stderr).not.toContain("direct-type.ts#DirectType");
    expect(result.stderr).not.toContain("all-types.ts#AllType");
    expect(result.stderr).not.toContain("runtime.ts#Runtime");
    expect(result.stderr).not.toContain("dynamic.ts#Dynamic");
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

  it("rejects a bootstrap-only metafile with no entry point", async () => {
    const metafilePath = await writeMetafile(
      { "src/bootstrap/index.ts": [] },
      [],
    );

    const result = await runNode("scripts/verify-module-boundaries.mjs", [
      "--bootstrap-only",
      "--metafile",
      metafilePath,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MODULE_BOOTSTRAP_ENTRYPOINT_COUNT_INVALID");
  });

  it("rejects a bootstrap-only metafile with two entry points", async () => {
    const metafilePath = await writeMetafile(
      {
        "src/bootstrap/index.ts": [],
        "src/bootstrap/alternate.ts": [],
      },
      ["src/bootstrap/index.ts", "src/bootstrap/alternate.ts"],
    );

    const result = await runNode("scripts/verify-module-boundaries.mjs", [
      "--bootstrap-only",
      "--metafile",
      metafilePath,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MODULE_BOOTSTRAP_ENTRYPOINT_COUNT_INVALID");
  });

  it("rejects a single foreign composition root", async () => {
    const metafilePath = await writeMetafile(
      { "src/ui/alternate-root.ts": [] },
      ["src/ui/alternate-root.ts"],
    );

    const result = await runNode("scripts/verify-module-boundaries.mjs", [
      "--bootstrap-only",
      "--metafile",
      metafilePath,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MODULE_BOOTSTRAP_ENTRYPOINT_INVALID");
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

  it("rejects duplicate content attributes before a safe value can hide a network policy", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "duplicate-content.html");
    await writeFile(
      artifactPath,
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src https://api.example.test; font-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'; worker-src blob:" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src \'none\'; font-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'; worker-src blob:">',
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_DUPLICATE_ATTRIBUTE");
  });
});

interface CommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

interface V600ArtifactOverrides {
  readonly appVersion?: string;
  readonly body?: string;
  readonly databaseSchemaVersion?: number;
  readonly pluginApiVersion?: number;
  readonly script?: string;
}

interface V600AuditFixture {
  readonly artifactPath: string;
  readonly evidencePath: string;
  readonly sourceRoot: string;
}

async function runNode(
  scriptPath: string,
  arguments_: readonly string[],
  workingDirectory?: string,
): Promise<CommandResult> {
  const absoluteScriptPath = resolve(scriptPath);
  try {
    const result = await execFileAsync(process.execPath, [absoluteScriptPath, ...arguments_], {
      cwd: workingDirectory,
    });
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

async function writeV600AuditFixture(
  options: {
    readonly artifact?: V600ArtifactOverrides;
    readonly evidence?: string;
    readonly sourceFiles?: Readonly<Record<string, string>>;
  } = {},
): Promise<V600AuditFixture> {
  const directory = await createTemporaryDirectory();
  const artifactPath = join(directory, "Prompt-Studio-V600.0.0-Phase1-Foundation.html");
  const evidencePath = join(directory, "phase1-iphone-viewer.md");
  const sourceRoot = join(directory, "src");
  await mkdir(sourceRoot, { recursive: true });
  for (const [relativePath, source] of Object.entries(options.sourceFiles ?? {})) {
    const sourcePath = join(sourceRoot, relativePath);
    await mkdir(resolve(sourcePath, ".."), { recursive: true });
    await writeFile(sourcePath, source, "utf8");
  }
  await Promise.all([
    writeFile(artifactPath, v600Artifact(options.artifact ?? {}), "utf8"),
    writeFile(evidencePath, options.evidence ?? COMPLETE_IPHONE_EVIDENCE, "utf8"),
  ]);
  return { artifactPath, evidencePath, sourceRoot };
}

async function runV600Audit(fixture: V600AuditFixture): Promise<CommandResult> {
  return runNode("scripts/verify-source-integrity.mjs", [
    "--artifact",
    fixture.artifactPath,
    "--report",
    fixture.evidencePath,
    "--source-root",
    fixture.sourceRoot,
  ]);
}

async function writeReleaseFixture(): Promise<string> {
  const directory = await createTemporaryDirectory();
  const sourceRoot = join(directory, "src");
  const reportDirectory = join(directory, "docs/reports");
  const distDirectory = join(directory, "dist");
  await Promise.all([
    mkdir(sourceRoot, { recursive: true }),
    mkdir(reportDirectory, { recursive: true }),
    mkdir(distDirectory, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      join(distDirectory, "Prompt-Studio-V600.0.0-Phase1-Foundation.html"),
      v600Artifact({}),
      "utf8",
    ),
    writeFile(
      join(reportDirectory, "phase1-iphone-viewer.md"),
      COMPLETE_IPHONE_EVIDENCE,
      "utf8",
    ),
  ]);
  return directory;
}

async function writeBaselineFixture(renderedIds: string): Promise<string> {
  const directory = await createTemporaryDirectory();
  const referenceDirectory = join(directory, "reference/v500.6.11");
  await mkdir(referenceDirectory, { recursive: true });
  await writeFile(
    join(
      referenceDirectory,
      "Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html",
    ),
    `<!doctype html><header>Prompt Studio V500.6.10</header>${renderedIds}<script>anchor.download='prompt-studio-v500-6-10-project.json'</script>`,
    "utf8",
  );
  await writeFile(
    join(referenceDirectory, "Prompt-Studio-V500.6.11-Test-Results.json"),
    JSON.stringify({
      browserEnvironmentNote:
        "A real iPhone HTML Viewer interaction was not executed in this environment.",
      staticIntegrity: {
        checks: {
          exportFilename: false,
          noDuplicateStaticIds: false,
        },
      },
    }),
    "utf8",
  );
  return directory;
}

async function writeMetafile(
  graph: Readonly<Record<string, readonly string[]>>,
  entryPoints: readonly string[] = ["src/bootstrap/index.ts"],
): Promise<string> {
  const directory = await createTemporaryDirectory();
  const metafilePath = join(directory, "meta.json");
  const completeGraph = {
    ...Object.fromEntries(entryPoints.map((entryPoint) => [entryPoint, [] as const])),
    ...graph,
  };
  const inputs = Object.fromEntries(
    Object.entries(completeGraph).map(([inputPath, imports]) => [
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
  const outputs = Object.fromEntries(
    entryPoints.map((entryPoint, index) => [
      `dist/entry-${index}.js`,
      {
        bytes: 1,
        entryPoint,
        exports: [],
        imports: [],
        inputs: {},
      },
    ]),
  );
  await writeFile(metafilePath, JSON.stringify({ inputs, outputs }), "utf8");
  return metafilePath;
}

function v600Artifact(overrides: V600ArtifactOverrides): string {
  const appVersion = overrides.appVersion ?? "V600.0.0-Phase1-Foundation";
  const databaseSchemaVersion = overrides.databaseSchemaVersion ?? 1;
  const pluginApiVersion = overrides.pluginApiVersion ?? 1;
  const body = overrides.body ?? '<main id="app">Prompt Studio V600</main>';
  const script = overrides.script ?? "const ready=true";

  return `<!doctype html><html><head><title>Prompt Studio V600</title><script id="prompt-studio-build-metadata" type="application/json">${JSON.stringify({ appVersion, databaseSchemaVersion, pluginApiVersion })}</script></head><body>${body}<script>${script}</script></body></html>`;
}
