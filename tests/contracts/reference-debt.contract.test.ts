import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];
const OUTPUT_FILE = resolve("dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html");
const VALID_CSP_POLICY = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "connect-src 'none'",
  "font-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "worker-src blob:",
].join("; ");
const SAFARI_SCREENSHOT_DATA = pngDataUri(createTestPng({ seed: 17 }));
const HTML_VIEWER_SCREENSHOT_DATA = pngDataUri(createTestPng({ seed: 53 }));
const ONE_PIXEL_PNG_DATA = pngDataUri(createTestPng({ height: 1, width: 1 }));
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

- Safari: ![Safari verification](${SAFARI_SCREENSHOT_DATA})
- HTML Viewer: ![HTML Viewer verification](${HTML_VIEWER_SCREENSHOT_DATA})
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
        script:
          "const anchor=document.createElement('a'); anchor.download='prompt-studio-v500-6-10-project.json'",
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
          `- Safari: ![Safari verification](${SAFARI_SCREENSHOT_DATA})`,
          "- Safari: PASS",
        ),
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_IPHONE_EVIDENCE_INVALID");
    expect(result.stderr).toContain("Device Model");
    expect(result.stderr).toContain("Safari screenshot");
  });

  it("rejects dead or external screenshot links", async () => {
    const fixture = await writeV600AuditFixture({
      evidence: COMPLETE_IPHONE_EVIDENCE
        .replace(SAFARI_SCREENSHOT_DATA, "screenshots/missing-safari.png")
        .replace(HTML_VIEWER_SCREENSHOT_DATA, "https://example.test/viewer.png"),
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_IPHONE_EVIDENCE_INVALID");
    expect(result.stderr).toContain("embedded image data");
  });

  it("rejects an embedded screenshot whose MIME type does not match its magic bytes", async () => {
    const fixture = await writeV600AuditFixture({
      evidence: COMPLETE_IPHONE_EVIDENCE.replace(
        SAFARI_SCREENSHOT_DATA,
        "data:image/png;base64,VGhpcyBpcyBub3QgYSBQTkcgZmlsZS4=",
      ),
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_IPHONE_EVIDENCE_INVALID");
    expect(result.stderr).toContain("magic bytes");
  });

  it("rejects identical Safari and HTML Viewer screenshot payloads", async () => {
    const fixture = await writeV600AuditFixture({
      evidence: COMPLETE_IPHONE_EVIDENCE.replace(
        HTML_VIEWER_SCREENSHOT_DATA,
        SAFARI_SCREENSHOT_DATA,
      ),
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_IPHONE_EVIDENCE_INVALID");
    expect(result.stderr).toContain("must be different");
  });

  it("rejects a missing embedded screenshot", async () => {
    const fixture = await writeV600AuditFixture({
      evidence: COMPLETE_IPHONE_EVIDENCE.replace(
        `- Safari: ![Safari verification](${SAFARI_SCREENSHOT_DATA})\n`,
        "",
      ),
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_IPHONE_EVIDENCE_INVALID");
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

  it("round-ten F1 rejects build metadata in a punctuated script start-tag lookalike", async () => {
    const fixture = await writeV600AuditFixture();
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(
      fixture.artifactPath,
      artifact.replace(
        '<script id="prompt-studio-build-metadata"',
        '<script! id="prompt-studio-build-metadata"',
      ),
      "utf8",
    );

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
    expect(result.stderr).toContain("V600_DATABASE_SCHEMA_VERSION_INVALID");
    expect(result.stderr).toContain("V600_PLUGIN_API_VERSION_INVALID");
  });

  it.each([
    ["RAWTEXT", "style", "<style>", "</style>"],
    ["RCDATA", "textarea", "<textarea>", "</textarea>"],
    ["template", "template", "<template>", "</template>"],
    ["scripting-enabled noscript", "noscript", "<noscript>", "</noscript>"],
    ["script", "script", '<script type="text/plain">', "</script>"],
  ])("round-ten F1 ignores build metadata after a punctuated %s end-tag lookalike", async (
    _label,
    name,
    openingTag,
    closingTag,
  ) => {
    const metadataSource = JSON.stringify({
      appVersion: "V600.0.0-Phase1-Foundation",
      databaseSchemaVersion: 1,
      pluginApiVersion: 1,
    });
    const metadataElement =
      `<script id="prompt-studio-build-metadata" type="application/json">${metadataSource}</script>`;
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          openingTag,
          `</${name}!>`,
          metadataElement,
          closingTag,
        ].join(""),
        script: "",
      },
    });
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(fixture.artifactPath, artifact.replace(metadataElement, ""), "utf8");

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
    expect(result.stderr).toContain("V600_DATABASE_SCHEMA_VERSION_INVALID");
    expect(result.stderr).toContain("V600_PLUGIN_API_VERSION_INVALID");
  });

  it.each([
    ["SVG", "svg"],
    ["MathML", "math"],
  ])("round-eleven F1 ignores build metadata inside %s CDATA", async (_label, name) => {
    const metadataSource = JSON.stringify({
      appVersion: "V600.0.0-Phase1-Foundation",
      databaseSchemaVersion: 1,
      pluginApiVersion: 1,
    });
    const metadataElement =
      `<script id="prompt-studio-build-metadata" type="application/json">${metadataSource}</script>`;
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          `<${name}><![CDATA[ignored >${metadataElement}]]></${name}>`,
        ].join(""),
        script: "",
      },
    });
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(fixture.artifactPath, artifact.replace(metadataElement, ""), "utf8");

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
    expect(result.stderr).toContain("V600_DATABASE_SCHEMA_VERSION_INVALID");
    expect(result.stderr).toContain("V600_PLUGIN_API_VERSION_INVALID");
  });

  it.each([
    ["SVG", "svg"],
    ["MathML", "math"],
  ])("round-eleven F1 keeps a template end-tag inert inside %s CDATA", async (
    _label,
    name,
  ) => {
    const metadataSource = JSON.stringify({
      appVersion: "V600.0.0-Phase1-Foundation",
      databaseSchemaVersion: 1,
      pluginApiVersion: 1,
    });
    const metadataElement =
      `<script id="prompt-studio-build-metadata" type="application/json">${metadataSource}</script>`;
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          `<template><${name}><![CDATA[ignored ></template>${metadataElement}]]></${name}></template>`,
        ].join(""),
        script: "",
      },
    });
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(fixture.artifactPath, artifact.replace(metadataElement, ""), "utf8");

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
    expect(result.stderr).toContain("V600_DATABASE_SCHEMA_VERSION_INVALID");
    expect(result.stderr).toContain("V600_PLUGIN_API_VERSION_INVALID");
  });

  it.each([
    ["SVG", "svg"],
    ["MathML", "math"],
  ])("round-eleven F1 accepts real build metadata outside %s CDATA", async (_label, name) => {
    const metadataSource = JSON.stringify({
      appVersion: "V600.0.0-Phase1-Foundation",
      databaseSchemaVersion: 1,
      pluginApiVersion: 1,
    });
    const metadataLookalike =
      `<script id="prompt-studio-build-metad&#97;ta" type="application/json">${metadataSource}</script>`;
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          `<${name}><![CDATA[ignored >${metadataLookalike}]]></${name}>`,
        ].join(""),
        script: "",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it.each([
    ["SVG", "svg"],
    ["MathML", "math"],
  ])("round-twelve F2 closes a self-closing %s tag with attributes", async (
    _label,
    name,
  ) => {
    const metadataSource = JSON.stringify({
      appVersion: "V600.0.0-Phase1-Foundation",
      databaseSchemaVersion: 1,
      pluginApiVersion: 1,
    });
    const metadataElement =
      `<script id="prompt-studio-build-metadata" type="application/json">${metadataSource}</script>`;
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          `<${name} data-kind="icon"/>`,
          metadataElement,
        ].join(""),
        script: "",
      },
    });
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(fixture.artifactPath, artifact.replace(metadataElement, ""), "utf8");

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it.each([
    ["SVG", "svg"],
    ["MathML", "math"],
  ])("round-twelve F2 does not self-close %s before whitespace", async (
    _label,
    name,
  ) => {
    const metadataSource = JSON.stringify({
      appVersion: "V600.0.0-Phase1-Foundation",
      databaseSchemaVersion: 1,
      pluginApiVersion: 1,
    });
    const metadataElement =
      `<script id="prompt-studio-build-metadata" type="application/json">${metadataSource}</script>`;
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          `<${name} / ><![CDATA[ignored >${metadataElement}]]></${name}>`,
        ].join(""),
        script: "",
      },
    });
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(fixture.artifactPath, artifact.replace(metadataElement, ""), "utf8");

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
    expect(result.stderr).toContain("V600_DATABASE_SCHEMA_VERSION_INVALID");
    expect(result.stderr).toContain("V600_PLUGIN_API_VERSION_INVALID");
  });

  it.each([
    ["SVG", "svg"],
    ["MathML", "math"],
  ])("round-twelve F2 does not self-close %s after an unquoted attribute value", async (
    _label,
    name,
  ) => {
    const metadataSource = JSON.stringify({
      appVersion: "V600.0.0-Phase1-Foundation",
      databaseSchemaVersion: 1,
      pluginApiVersion: 1,
    });
    const metadataElement =
      `<script id="prompt-studio-build-metadata" type="application/json">${metadataSource}</script>`;
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          `<${name} data-kind=icon/><![CDATA[ignored >${metadataElement}]]></${name}>`,
        ].join(""),
        script: "",
      },
    });
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(fixture.artifactPath, artifact.replace(metadataElement, ""), "utf8");

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
    expect(result.stderr).toContain("V600_DATABASE_SCHEMA_VERSION_INVALID");
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

  it.each([
    ["script", "<script></script>"],
    ["style", "<style></style>"],
  ])("round-ten F1 keeps V500 text visible inside a punctuated %s start-tag lookalike", async (
    name,
    laterRealElement,
  ) => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          `<${name}!>Prompt Studio V500.9.9</${name}!>`,
          laterRealElement,
          '<main id="app">Prompt Studio V600</main>',
        ].join(""),
        script: "",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("round-ten F1 keeps V500 text inert after a punctuated style end-tag through EOF", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          "<style>Prompt Studio V500.9.9</style!>",
        ].join(""),
        script: "",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-ten F1 keeps V500 text inert after a punctuated script end-tag through EOF", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          '<script type="text/plain">Prompt Studio V500.9.9</script!>',
        ].join(""),
        script: "",
      },
    });
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(
      fixture.artifactPath,
      artifact.replace("<script></script></body>", "<script!></script!></body>"),
      "utf8",
    );

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("rejects a static V500 product version assigned to a visible DOM sink", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script:
          "document.getElementById('app').textContent = 'Prompt Studio V500.9.9'",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("resolves local constant aliases assigned to a visible DOM sink", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script: [
          "const LABEL = 'Prompt Studio V500.9.9'",
          "const visibleAlias = LABEL",
          "document.getElementById('app').textContent = visibleAlias",
        ].join(";"),
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("allows technical V500 paths outside visible DOM sinks", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script:
          "const migrationSource = 'reference/v500.6.11/data.json'; const legacyImportVersion = 'V500.6.11'",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("rejects a non-V600 static JSON export filename", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script:
          "const anchor=document.createElement('a'); anchor.download='wrong-release-project.json'",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("rejects a static V500 JSON export filename", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script:
          "const anchor=document.createElement('a'); anchor.download='prompt-studio-v500-project.json'",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("does not classify dynamic user-provided export names as static literals", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script:
          "const anchor=document.createElement('a'); anchor.download=userProvidedName; const template=`prompt-studio-${version}.json`",
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("rejects an invalid JSON export name reached through local constant aliases", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script: [
          "const anchor = document.createElement('a')",
          "const EXPORT_NAME = 'wrong-release-project.json'",
          "const localAlias = EXPORT_NAME",
          "anchor.download = localAlias",
        ].join(";"),
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("resolves generic local alias chains used by an actual download sink", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script: [
          "const anchor = document.createElement('a')",
          "const baseName = 'wrong-alias-project.json'",
          "const localAlias = baseName",
          "anchor.download = localAlias",
        ].join(";"),
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("accepts a valid JSON export name reached through a local constant alias", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script: [
          "const anchor = document.createElement('a')",
          "const EXPORT_NAME = 'prompt-studio-v600-project.json'",
          "const localAlias = EXPORT_NAME",
          "anchor.download = localAlias",
        ].join(";"),
      },
    });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("ignores unrelated object filename fields", async () => {
    const fixture = await writeV600AuditFixture({
      artifact: {
        script: "const note = { filename: 'notes.json', body: 'offline notes' }; void note",
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

describe("V600 structural PNG evidence contract", () => {
  it("accepts two distinct deterministic portrait PNG screenshots", async () => {
    const result = await runEvidenceAudit(SAFARI_SCREENSHOT_DATA);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("accepts an 8-bit RGBA portrait PNG screenshot", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ colorType: 6, seed: 71 })),
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("rejects a structurally valid 1x1 PNG", async () => {
    const result = await runEvidenceAudit(ONE_PIXEL_PNG_DATA);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("at least 640 x 1000 in portrait");
  });

  it.each([
    ["too narrow", { height: 1000, width: 639 }],
    ["too short", { height: 999, width: 640 }],
    ["not portrait", { height: 1000, width: 1000 }],
  ])("rejects a PNG that is %s", async (_label, dimensions) => {
    const result = await runEvidenceAudit(pngDataUri(createTestPng(dimensions)));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("at least 640 x 1000 in portrait");
  });

  it.each([
    ["16-bit", { bitDepth: 16 }],
    ["grayscale", { colorType: 0 }],
    ["interlaced", { interlace: 1 }],
  ])("rejects a %s PNG header", async (_label, header) => {
    const result = await runEvidenceAudit(pngDataUri(createTestPng(header)));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("8-bit RGB or RGBA without interlacing");
  });

  it("rejects PNG signature bytes without a complete chunk stream", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("IHDR");
  });

  it("rejects a truncated PNG chunk stream", async () => {
    const png = createTestPng({ seed: 23 });
    const result = await runEvidenceAudit(pngDataUri(png.subarray(0, -6)));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("valid PNG structure");
  });

  it("rejects a PNG with a corrupted chunk CRC", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(corruptFirstIdatByte(createTestPng({ seed: 29 }))),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CRC");
  });

  it.each([
    ["JPEG", fakeJpegDataUri()],
    ["WebP", fakeWebpDataUri()],
  ])("rejects embedded %s evidence even when its MIME and magic agree", async (_label, dataUri) => {
    const result = await runEvidenceAudit(dataUri);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("must use PNG");
  });

  it("rejects a PNG with duplicate IHDR chunks", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ duplicateIhdr: true })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("exactly one IHDR");
  });

  it("rejects a PNG without IDAT data", async () => {
    const result = await runEvidenceAudit(pngDataUri(createTestPng({ omitIdat: true })));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("IDAT");
  });

  it("rejects a PNG without IEND", async () => {
    const result = await runEvidenceAudit(pngDataUri(createTestPng({ omitIend: true })));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("IEND");
  });

  it("rejects PNG IDAT data that cannot be inflated", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ idatData: Buffer.from("not-zlib-data") })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("inflate");
  });

  it("rejects inflated PNG data with an incorrect scanline length", async () => {
    const scanlines = createTestScanlines(640, 1000, 31, 3);
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ rawData: scanlines.subarray(0, -1) })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("scanline length");
  });

  it("rejects PNG scanlines with an invalid filter byte", async () => {
    const scanlines = createTestScanlines(640, 1000, 37, 3);
    scanlines[0] = 5;
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ rawData: scanlines })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("filter byte");
  });

  it("rejects a structurally valid PNG without nontrivial image variation", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ seed: 0, solid: true })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("image variation");
  });

  it("round-five F5 rejects chunk type bytes with the high bit set", async () => {
    const png = replaceFirstPngChunkType(
      createTestPng({ seed: 79 }),
      "IDAT",
      Buffer.from([0xc9, 0x44, 0x41, 0x54]),
    );

    const result = await runEvidenceAudit(pngDataUri(png));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("chunk types");
  });

  it("round-five F5 rejects a PNG chunk with the reserved type bit set", async () => {
    const png = insertPngChunkBefore(
      createTestPng({ seed: 83 }),
      "IDAT",
      pngChunk("texT", Buffer.from("reserved-bit", "ascii")),
    );

    const result = await runEvidenceAudit(pngDataUri(png));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("reserved bit");
  });

  it("round-five F5 rejects RGB variation that is fully transparent", async () => {
    const scanlines = createTestScanlines(640, 1000, 89, 4);
    makeRgbaScanlinesTransparent(scanlines, 640, 1000);

    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ colorType: 6, rawData: scanlines })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("visible image variation");
  });

  it("round-five F5 rejects variation confined to a few pixels", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ rawData: createSparseVariationScanlines(640, 1000) })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("spatially relevant image variation");
  });

  it.each([
    ["one horizontal row", createLineVariationScanlines(640, 1000, "horizontal")],
    ["one vertical column", createLineVariationScanlines(640, 1000, "vertical")],
    ["a thin outer edge", createEdgeVariationScanlines(640, 1000, 4)],
  ])("round-six F5 rejects visible variation confined to %s", async (_label, scanlines) => {
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ rawData: scanlines })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("spatially relevant image variation");
  });

  it("round-five F6 rejects dimensions that exceed bounded PNG resources", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({
        height: 10000,
        idatData: deflateSync(Buffer.from([0])),
        width: 5000,
      })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("PNG resource limits");
  });

  it("round-five F6 rejects an oversized compressed PNG payload before inflate", async () => {
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ idatData: Buffer.alloc(8 * 1024 * 1024 + 1) })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("compressed PNG payload exceeds limit");
  });

  it("round-five F6 bounds inflate output to the expected scanline size", async () => {
    const expectedScanlineBytes = 1000 * (640 * 3 + 1);
    const result = await runEvidenceAudit(
      pngDataUri(createTestPng({ rawData: Buffer.alloc(expectedScanlineBytes + 1) })),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("inflate within expected output limit");
  });

  it("round-six F6 rejects an oversized evidence file before parsing it", async () => {
    const fixture = await writeV600AuditFixture();
    await truncate(fixture.evidencePath, 48 * 1024 * 1024 + 1);

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("evidence file exceeds resource limit");
  });

  it("round-six F6 rejects oversized encoded PNG data before base64 decoding", async () => {
    const oversizedPayload = "A".repeat(4 * Math.ceil((16 * 1024 * 1024 + 1) / 3));
    const evidence = COMPLETE_IPHONE_EVIDENCE.replace(
      SAFARI_SCREENSHOT_DATA,
      `data:image/png;base64,${oversizedPayload}`,
    );

    const result = await runV600Audit(await writeV600AuditFixture({ evidence }));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("encoded PNG payload exceeds resource limit");
  });

  it("round-six F6 limits zero-length IDAT chunk amplification", async () => {
    const zeroLengthIdatChunks = Buffer.concat(
      Array.from({ length: 65 }, () => pngChunk("IDAT", Buffer.alloc(0))),
    );
    const png = insertPngChunkBefore(
      createTestPng({ seed: 97 }),
      "IDAT",
      zeroLengthIdatChunks,
    );

    const result = await runEvidenceAudit(pngDataUri(png));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("zero-length IDAT chunk limit");
  });

  it("round-six F6 limits the total PNG chunk count", async () => {
    const ancillaryChunks = Buffer.concat(
      Array.from({ length: 4097 }, () => pngChunk("tEXt", Buffer.alloc(0))),
    );
    const png = insertPngChunkBefore(
      createTestPng({ seed: 101 }),
      "IDAT",
      ancillaryChunks,
    );

    const result = await runEvidenceAudit(pngDataUri(png));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("PNG chunk count exceeds limit");
  });
});

describe("V600 lexical scope and anchor resolution contract", () => {
  it("uses the nearest block-scoped label at an inner visible sink", async () => {
    const result = await runScriptAudit([
      "const LABEL = 'Prompt Studio V500.9.9'",
      "{",
      "const LABEL = 'Prompt Studio V600'",
      "document.getElementById('app').textContent = LABEL",
      "}",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("resolves an outer label after a same-name inner binding leaves scope", async () => {
    const result = await runScriptAudit([
      "const LABEL = 'Prompt Studio V500.9.9'",
      "{ const LABEL = 'Prompt Studio V600'; void LABEL }",
      "document.getElementById('app').textContent = LABEL",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("does not let an inner alias cycle hide an outer invalid label", async () => {
    const result = await runScriptAudit([
      "const LABEL = 'Prompt Studio V500.9.9'",
      "{ const LABEL = labelAlias; const labelAlias = LABEL; void labelAlias }",
      "document.getElementById('app').textContent = LABEL",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("does not resolve a label declared after the visible sink", async () => {
    const result = await runScriptAudit([
      "document.getElementById('app').textContent = LABEL",
      "{ const LABEL = 'Prompt Studio V500.9.9'; void LABEL }",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("keeps an outer label alias bound across later inner shadowing", async () => {
    const result = await runScriptAudit([
      "const LABEL = 'Prompt Studio V500.9.9'",
      "const visibleAlias = LABEL",
      "{ const LABEL = 'Prompt Studio V600'; void LABEL }",
      "document.getElementById('app').textContent = visibleAlias",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("resolves an outer export name after a same-name inner binding leaves scope", async () => {
    const result = await runScriptAudit([
      "const fileName = 'wrong-outer-project.json'",
      "{ const fileName = 'prompt-studio-v600-project.json'; void fileName }",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("keeps an outer export alias bound across later inner shadowing", async () => {
    const result = await runScriptAudit([
      "const fileName = 'wrong-outer-alias.json'",
      "const exportAlias = fileName",
      "{ const fileName = 'prompt-studio-v600-project.json'; void fileName }",
      "const anchor = document.createElement('a')",
      "anchor.download = exportAlias",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("does not let an inner alias cycle hide an outer invalid export name", async () => {
    const result = await runScriptAudit([
      "const fileName = 'wrong-cycle-project.json'",
      "{ const fileName = nameAlias; const nameAlias = fileName; void nameAlias }",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("does not resolve an export name declared after the download sink", async () => {
    const result = await runScriptAudit([
      "const anchor = document.createElement('a')",
      "anchor.download = FILE_NAME",
      "{ const FILE_NAME = 'notes.json'; void FILE_NAME }",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("rejects dot-property downloads on a statically created anchor", async () => {
    const result = await runScriptAudit(
      "const anchor=document.createElement('a'); anchor.download='notes.json'",
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("follows local aliases of a statically created anchor", async () => {
    const result = await runScriptAudit([
      "const anchor = document.createElement('a')",
      "const downloadTarget = anchor",
      "const localAnchor = downloadTarget",
      "localAnchor.download = 'notes.json'",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("rejects bracket-property downloads on a statically created anchor", async () => {
    const result = await runScriptAudit(
      "const anchor=document.createElement('a'); anchor['download']='notes.json'",
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("rejects setAttribute downloads through a local anchor alias", async () => {
    const result = await runScriptAudit([
      "const anchor = document.createElement('a')",
      "const localAnchor = anchor",
      "localAnchor.setAttribute('download', 'notes.json')",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("ignores download properties on unrelated settings objects", async () => {
    const result = await runScriptAudit("settings.download = 'notes.json'");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("ignores setAttribute download calls on non-anchor elements", async () => {
    const result = await runScriptAudit([
      "const panel = document.createElement('div')",
      "panel.setAttribute('download', 'notes.json')",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-five F2 evaluates the complete binary filename expression", async () => {
    const result = await runScriptAudit([
      "const anchor = document.createElement('a')",
      "anchor.download = 'prompt-studio-v600-project.json' + '.bak'",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["member", "'wrong-member.json'.length"],
    ["call", "'wrong-call.json'.toUpperCase()"],
  ])(
    "round-five F2 does not treat a leading literal as the complete %s expression",
    async (_label, expression) => {
      const result = await runScriptAudit([
        "const anchor = document.createElement('a')",
        `anchor.download = ${expression}`,
      ].join(";"));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
    },
  );

  it.each([
    [
      "for-loop let binding",
      [
        "const LABEL = 'Prompt Studio V500.9.9'",
        "for (let LABEL = 'Prompt Studio V600', index = 0; index < 1; index += 1) {",
        "document.getElementById('app').textContent = LABEL",
        "}",
      ].join(";"),
    ],
    [
      "function parameter",
      [
        "const LABEL = 'Prompt Studio V500.9.9'",
        "function render(LABEL) { document.getElementById('app').textContent = LABEL }",
        "render('Prompt Studio V600')",
      ].join(";"),
    ],
    [
      "TDZ let binding",
      [
        "const LABEL = 'Prompt Studio V500.9.9'",
        "{ document.getElementById('app').textContent = LABEL; let LABEL = 'Prompt Studio V600' }",
      ].join(";"),
    ],
  ])("round-five F3 respects the nearest %s", async (_label, script) => {
    const result = await runScriptAudit(script);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-five F3 resolves a later outer label captured by a function", async () => {
    const result = await runScriptAudit([
      "function render() { document.getElementById('app').textContent = LABEL }",
      "const LABEL = 'Prompt Studio V500.9.9'",
      "render()",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("round-five F3 resolves a later outer export name captured by a function", async () => {
    const result = await runScriptAudit([
      "function save() {",
      "const anchor = document.createElement('a')",
      "anchor.download = FILE_NAME",
      "}",
      "const FILE_NAME = 'wrong-captured-project.json'",
      "save()",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-five F3 resolves an unchanged static let label", async () => {
    const result = await runScriptAudit([
      "let LABEL = 'Prompt Studio V500.9.9'",
      "document.getElementById('app').textContent = LABEL",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
  });

  it("round-five F3 resolves an unchanged static let export name", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-let-project.json'",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-five F4 recognizes a direct createElement anchor receiver", async () => {
    const result = await runScriptAudit(
      "document.createElement('a').download = 'notes.json'",
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-five F4 does not classify a derived member value as an anchor", async () => {
    const result = await runScriptAudit([
      "const anchor = document.createElement('a').ownerDocument",
      "anchor.download = 'notes.json'",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-five F4 ignores createElement calls on a shadowed document parameter", async () => {
    const result = await runScriptAudit([
      "function prepareDownload(document) {",
      "const anchor = document.createElement('a')",
      "anchor.download = 'notes.json'",
      "}",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-five F7 resolves a deep alias chain iteratively within a timeout", async () => {
    const aliases = ["const alias0 = 'notes.json'"];
    for (let index = 1; index <= 12000; index += 1) {
      aliases.push(`const alias${index} = alias${index - 1}`);
    }
    const result = await runScriptAudit([
      "const anchor = document.createElement('a')",
      ...aliases,
      "anchor.download = alias12000",
    ].join(";"), 8000);

    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
    expect(result.stderr).not.toContain("SOURCE_INTEGRITY_FATAL");
  }, 12000);

  it("round-six F2 analyzes executable scripts with an unrelated data-type attribute", async () => {
    const result = await runScriptAudit(
      "const anchor=document.createElement('a'); anchor.download='notes.json'",
      undefined,
      'data-type="text/plain"',
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["numeric", "text&#x2f;javascript"],
    ["named", "text&sol;javascript"],
  ])("round-six F2 decodes %s character references in the exact script type attribute", async (_label, type) => {
    const result = await runScriptAudit(
      "const anchor=document.createElement('a'); anchor.download='notes.json'",
      undefined,
      `type="${type}"`,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-six F2 fails closed on conflicting duplicate script type attributes", async () => {
    const result = await runScriptAudit(
      "const anchor=document.createElement('a'); anchor.download='notes.json'",
      undefined,
      'type="text/plain" type="module"',
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-seven F2 ends script raw text at a slash-delimited end tag", async () => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      '<script type="text/plain">ignored</script/>',
      '<script>const anchor=document.createElement("a"); anchor.download="notes.json";</script>',
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-eight F1 analyzes executable code after a script double-escape end", async () => {
    const result = await runScriptAudit([
      "<!--<script></script>",
      "const anchor = document.createElement('a')",
      "anchor.download = 'notes.json'",
    ].join("\n"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-eight F2 analyzes a JavaScript MIME essence with parameters", async () => {
    const result = await runScriptAudit(
      "const anchor=document.createElement('a'); anchor.download='notes.json'",
      undefined,
      'type="text/javascript; charset=utf-8"',
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-eight F2 decodes a named parameter delimiter in the script type", async () => {
    const result = await runScriptAudit(
      "const anchor=document.createElement('a'); anchor.download='notes.json'",
      undefined,
      'type="text/javascript&semi; charset=utf-8"',
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-six F3 resolves a let value at the sink before a later write", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-later-write.json'",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
      "fileName = userProvidedName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["destructuring assignment", "[fileName] = userProvidedNames"],
    ["destructuring assignment with a default", "[fileName = 'fallback.json'] = userProvidedNames"],
    ["destructuring loop assignment", "for ([fileName] of userProvidedRows) {}"],
  ])("round-six F3 treats a prior %s as a reaching write", async (_label, write) => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-reaching-write.json'",
      write,
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-six F4 keeps separate module-script lexical scopes independent", async () => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      '<script type="module">const document = { createElement() { return {}; } };</script>',
      '<script type="module">const anchor = document.createElement("a"); anchor.download = "notes.json";</script>',
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["default", 'import document from "./fake.js"'],
    ["namespace", 'import * as document from "./fake.js"'],
    ["named alias", 'import { fake as document } from "./fake.js"'],
  ])("round-six F4 treats a %s import as a local module binding", async (_label, importStatement) => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      `<script type="module">${importStatement}; const anchor = document.createElement("a"); anchor.download = "notes.json";</script>`,
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-six F4 preserves shared top-level bindings across classic scripts", async () => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      '<script>const document = { createElement() { return {}; } };</script>',
      '<script>const anchor = document.createElement("a"); anchor.download = "notes.json";</script>',
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-seven F3 does not retroactively apply a later classic-script binding", async () => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      '<script>const anchor = document.createElement("a"); anchor.download = "notes.json";</script>',
      '<script>const document = { createElement() { return {}; } };</script>',
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-twelve F5 resolves a later global binding in an invoked classic-script closure", async () => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      [
        "<script>",
        "function save() {",
        "const anchor = document.createElement('a');",
        "anchor.download = FILE_NAME;",
        "}",
        "</script>",
      ].join(""),
      '<script>const FILE_NAME = "wrong-cross-script-closure.json"; save();</script>',
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-twelve F5 does not apply a later global binding to an earlier top-level sink", async () => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      '<script>const anchor = document.createElement("a"); anchor.download = FILE_NAME;</script>',
      '<script>const FILE_NAME = "wrong-later-top-level.json";</script>',
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it.each([
    ["unterminated block comment", "/*"],
    ["unterminated template literal", "const ignored = `"],
  ])("round-seven F3 parses a later classic script separately from an %s", async (_label, firstScript) => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      `<script>${firstScript}</script>`,
      '<script>const anchor = document.createElement("a"); anchor.download = "notes.json";</script>',
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["style RAWTEXT", "<style><script>void 0</style>"],
    ["textarea RCDATA", "<textarea><script>void 0</textarea>"],
    ["inert template contents", "<template><script>void 0</template>"],
    ["scripting-enabled noscript contents", "<noscript><script>void 0</noscript>"],
  ])("round-nine F2 analyzes a real script after a lookalike in %s", async (_label, lookalike) => {
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      lookalike,
      '<script>const anchor=document.createElement("a"); anchor.download="notes.json";</script>',
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["RAWTEXT", "style"],
    ["RCDATA", "textarea"],
    ["template", "template"],
    ["scripting-enabled noscript", "noscript"],
    ["script", "script"],
  ])("round-ten F1 analyzes a real script inside a punctuated %s start-tag lookalike", async (_label, name) => {
    const invalidExport =
      'const anchor=document.createElement("a"); anchor.download="notes.json";';
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      `<${name}!><script>${invalidExport}</script></${name}!>`,
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["RAWTEXT", "style", "<style>", "</style>"],
    ["RCDATA", "textarea", "<textarea>", "</textarea>"],
    ["template", "template", "<template>", "</template>"],
    ["scripting-enabled noscript", "noscript", "<noscript>", "</noscript>"],
    ["non-executable script", "script", '<script type="text/plain">', "</script>"],
  ])("round-ten F1 keeps a real script inert after a punctuated %s end-tag lookalike", async (
    _label,
    name,
    openingTag,
    closingTag,
  ) => {
    const invalidExport =
      'const anchor=document.createElement("a"); anchor.download="notes.json";';
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      openingTag,
      `</${name}!><script>${invalidExport}</script>`,
      closingTag,
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it.each([
    ["an abruptly closed empty comment", "<!-->"],
    ["an incorrectly closed comment", "<!--ignored--!>"],
  ])("round-ten F2 analyzes a real script after %s", async (_label, comment) => {
    const invalidExport =
      'const anchor=document.createElement("a"); anchor.download="notes.json";';
    const body = [
      '<main id="app">Prompt Studio V600</main>',
      comment,
      `<script>${invalidExport}</script>`,
    ].join("");
    const fixture = await writeV600AuditFixture({ artifact: { body, script: "" } });

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-twelve F3 keeps build metadata inert after double-escaped dashes", async () => {
    const metadataSource = JSON.stringify({
      appVersion: "V600.0.0-Phase1-Foundation",
      databaseSchemaVersion: 1,
      pluginApiVersion: 1,
    });
    const metadataElement =
      `<script id="prompt-studio-build-metadata" type="application/json">${metadataSource}</script>`;
    const fixture = await writeV600AuditFixture({
      artifact: {
        body: [
          '<main id="app">Prompt Studio V600</main>',
          `<script type="text/plain"><!--<script>--></script>${metadataElement}</script>`,
        ].join(""),
        script: "",
      },
    });
    const artifact = await readFile(fixture.artifactPath, "utf8");
    await writeFile(fixture.artifactPath, artifact.replace(metadataElement, ""), "utf8");

    const result = await runV600Audit(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_VERSION_METADATA_STALE");
    expect(result.stderr).toContain("V600_DATABASE_SCHEMA_VERSION_INVALID");
    expect(result.stderr).toContain("V600_PLUGIN_API_VERSION_INVALID");
  });

  it.each([
    ["function declaration", "function neverCalled() { fileName = userProvidedName; }"],
    ["arrow function", "const neverCalled = () => { fileName = userProvidedName; }"],
  ])("round-seven F4 ignores a write inside a never-called nested %s", async (_label, nestedFunction) => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-nested-write.json'",
      nestedFunction,
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["IIFE", "(() => { fileName = userProvidedName; })()"],
    [
      "direct function call",
      "function mutate() { fileName = userProvidedName; }; mutate()",
    ],
  ])("round-seven F4 applies a nested write executed by a synchronous %s", async (_label, executedWrite) => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-executed-write.json'",
      executedWrite,
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-eight F3 ignores a generator write before the generator is iterated", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-generator-write.json'",
      "function* mutate() { fileName = userProvidedName }",
      "mutate()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-eight F3 ignores an async write after await at a synchronous sink", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-async-write.json'",
      "async function mutate() { await Promise.resolve(); fileName = userProvidedName }",
      "mutate()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-eight F3 ignores a for-await body write at a synchronous sink", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-for-await-write.json'",
      "async function mutate() { for await (const value of values) { fileName = value } }",
      "mutate()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-eight F3 applies a generator write reached by direct iteration", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-generator-iteration.json'",
      "function* mutate() { fileName = userProvidedName; yield undefined }",
      "const iterator = mutate()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-nine F3 applies a generator write reached by the second next call", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-second-generator-segment.json'",
      "function* mutate() { yield undefined; fileName = userProvidedName; yield undefined }",
      "const iterator = mutate()",
      "iterator.next()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-nine F3 applies a generator write reached by the third next call", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-third-generator-segment.json'",
      "function* mutate() { yield undefined; yield undefined; fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "iterator.next()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-nine F3 does not reach the second generator segment with one next call", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-unreached-generator-segment.json'",
      "function* mutate() { yield undefined; fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-ten F3 applies a write in an unparenthesized yield operand before suspension", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-yield-operand.json'",
      "function* mutate() { yield fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-ten F3 keeps a write after yield out of the first resumption", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-post-yield-write.json'",
      "function* mutate() { yield userProvidedName; fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-ten F3 applies a write after yield on the next resumption", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-resumed-post-yield-write.json'",
      "function* mutate() { yield userProvidedName; fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-twelve F4 does not finish a static three-value yield delegation after two resumptions", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-still-reaching.json'",
      "function* mutate() { yield* [1, 2, 3]; fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-twelve F4 reaches past a static three-value yield delegation on the fourth resumption", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-after-static-delegation.json'",
      "function* mutate() { yield* [1, 2, 3]; fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "iterator.next()",
      "iterator.next()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-twelve F4 does not assume an unknown yield delegation has completed", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-after-unknown-delegation.json'",
      "function* mutate() { yield* delegatedValues; fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "iterator.next()",
      "iterator.next()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-twelve F4 does not bound a yield delegation through a mutable const array", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-mutated-delegation.json'",
      "const delegatedValues = [1]",
      "delegatedValues.push(2, 3)",
      "function* mutate() { yield* delegatedValues; fileName = userProvidedName }",
      "const iterator = mutate()",
      "iterator.next()",
      "iterator.next()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-eight F3 applies a write in an await operand before suspension", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-await-operand.json'",
      "async function mutate() { await (fileName = userProvidedName) }",
      "mutate()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SOURCE_INTEGRITY_OK");
  });

  it("round-nine F1 ignores an assignment-target write after awaiting its RHS", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-awaited-assignment.json'",
      "async function mutate() { fileName = await userProvidedName }",
      "mutate()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it("round-nine F1 ignores a for-await assignment-target write", async () => {
    const result = await runScriptAudit([
      "let fileName = 'wrong-before-for-await-target.json'",
      "async function mutate() { for await (fileName of values) {} }",
      "mutate()",
      "const anchor = document.createElement('a')",
      "anchor.download = fileName",
    ].join(";"));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
  });

  it.each([
    ["dot property", "document.createElement('a', {}).download = 'notes.json'"],
    ["bracket property", "document.createElement('a', {})['download'] = 'notes.json'"],
    [
      "setAttribute call",
      "document.createElement('a', {}).setAttribute('download', 'notes.json')",
    ],
  ])("round-seven F5 recognizes a two-argument anchor at a %s sink", async (_label, script) => {
    const result = await runScriptAudit(script);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("V600_EXPORT_FILENAME_INVALID");
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

  it("accepts one early head policy while ignoring CSP lookalikes in non-effective contexts", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "effective-head-policy.html");
    const fakeMeta = cspMeta("connect-src https://ignored.example.test");
    await writeFile(
      artifactPath,
      [
        "<!doctype html>",
        `<!-- ${fakeMeta} -->`,
        "<html><head>",
        '<meta charset="utf-8">',
        cspMeta(VALID_CSP_POLICY),
        `<script>const fakeMeta = ${JSON.stringify(fakeMeta)}</script>`,
        `<style>/* ${fakeMeta} */</style>`,
        "</head><body>",
        `<template>${fakeMeta}</template>`,
        `<noscript>${fakeMeta}</noscript>`,
        fakeMeta,
        "</body></html>",
      ].join(""),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CSP_OK");
  });

  it("does not count CSP lookalikes in comments, raw text or inert containers", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "inert-policy-lookalikes.html");
    const fakeMeta = cspMeta(VALID_CSP_POLICY);
    await writeFile(
      artifactPath,
      [
        "<!doctype html>",
        `<!-- ${fakeMeta} -->`,
        "<html><head>",
        `<script>const fakeMeta = ${JSON.stringify(fakeMeta)}</script>`,
        `<style>/* ${fakeMeta} */</style>`,
        "</head><body>",
        `<template>${fakeMeta}</template>`,
        `<noscript>${fakeMeta}</noscript>`,
        "</body></html>",
      ].join(""),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it("rejects a CSP meta tag in the body instead of treating it as effective", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "body-policy.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head><title>Prompt Studio</title></head><body>${cspMeta(VALID_CSP_POLICY)}</body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it("rejects a CSP meta tag before the real head instead of treating it as effective", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "pre-head-policy.html");
    await writeFile(
      artifactPath,
      `<!doctype html>${cspMeta(VALID_CSP_POLICY)}<html><head><title>Prompt Studio</title></head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it.each([
    ["script", "<script>void 0</script>"],
    ["style", "<style>body{color:CanvasText}</style>"],
    ["stylesheet", '<link rel="stylesheet" href="data:text/css,body{}">'],
  ])("rejects a CSP policy after head %s content", async (_label, priorContent) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "late-policy.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head>${priorContent}${cspMeta(VALID_CSP_POLICY)}</head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_META_TOO_LATE");
  });

  it("rejects a parsed policy containing a network target", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "network-enabled.html");
    await writeFile(
      artifactPath,
      htmlWithHead(
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src https://api.example.test; font-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'; worker-src blob:">',
      ),
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
      htmlWithHead(
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src https://api.example.test; font-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'; worker-src blob:" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src \'none\'; font-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'; worker-src blob:">',
      ),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_DUPLICATE_ATTRIBUTE");
  });

  it("rejects a duplicate content attribute when the network policy is unquoted", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "duplicate-unquoted-content.html");
    await writeFile(
      artifactPath,
      htmlWithHead(
        '<meta http-equiv=Content-Security-Policy content=default-src&#32;* content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src \'none\'; font-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'; worker-src blob:">',
      ),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_DUPLICATE_ATTRIBUTE");
  });

  it("fails closed when a CSP meta tag contains malformed or unparsed attributes", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "malformed-csp-meta.html");
    await writeFile(
      artifactPath,
      htmlWithHead(
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'" broken=>',
      ),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_META_ATTRIBUTE_SYNTAX_INVALID");
  });

  it.each([
    [
      "a head opened after body",
      `<!doctype html><html><body></body><head>${cspMeta(VALID_CSP_POLICY)}</head></html>`,
    ],
    [
      "whitespace between the less-than sign and head",
      `<!doctype html><html>< head>${cspMeta(VALID_CSP_POLICY)}</head><body></body></html>`,
    ],
    [
      "CDATA-like bogus comment markup",
      `<!doctype html><html><head><![CDATA[${cspMeta(VALID_CSP_POLICY)}]]></head><body></body></html>`,
    ],
    [
      "processing-instruction-like bogus comment markup",
      `<!doctype html><html><head><?ignored ${cspMeta(VALID_CSP_POLICY)}></head><body></body></html>`,
    ],
  ])("round-five F1 ignores a CSP lookalike inside %s", async (_label, html) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-five-inert-policy.html");
    await writeFile(artifactPath, html, "utf8");

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it.each([
    [
      "a punctuated head-like tag name",
      `<!doctype html><html><head!>${cspMeta(VALID_CSP_POLICY)}</head!><body></body></html>`,
    ],
    [
      "body content before an explicit head",
      `<!doctype html><html><div>body content</div><head>${cspMeta(VALID_CSP_POLICY)}</head></html>`,
    ],
    [
      "body content that implicitly closes head",
      `<!doctype html><html><head><div>body content</div>${cspMeta(VALID_CSP_POLICY)}</head></html>`,
    ],
  ])("round-five F1 rejects a policy after %s", async (_label, html) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-five-implicit-body.html");
    await writeFile(artifactPath, html, "utf8");

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it("round-five F1 recognizes a semicolonless numeric reference in http-equiv", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "encoded-duplicate-policy.html");
    await writeFile(
      artifactPath,
      htmlWithHead([
        cspMeta(VALID_CSP_POLICY),
        `<meta http-equiv="Content-Security-Polic&#x79" content="${VALID_CSP_POLICY}">`,
      ].join("")),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 2");
  });

  it("round-five F1 rejects non-ASCII CSP whitespace decoded from an attribute", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "non-ascii-csp-whitespace.html");
    await writeFile(
      artifactPath,
      htmlWithHead(cspMeta(VALID_CSP_POLICY.replace("default-src ", "default-src&#160;"))),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_ASCII_WHITESPACE_INVALID");
  });

  it("round-six F1 rejects a policy after character data has implicitly ended the head", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-six-character-data-head.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head>x${cspMeta(VALID_CSP_POLICY)}</head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it("round-six F1 processes head metadata after ASCII whitespace in the after-head state", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-six-after-head-whitespace.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head></head> \n\t${cspMeta(VALID_CSP_POLICY)}<body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CSP_OK");
  });

  it("round-six F1 counts a second effective policy in the after-head state", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-six-after-head-duplicate.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head>${cspMeta(VALID_CSP_POLICY)}</head>${cspMeta(VALID_CSP_POLICY)}<body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 2");
  });

  it("round-six F1 treats noframes contents as raw text", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-six-noframes-raw-text.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head><noframes>${cspMeta(VALID_CSP_POLICY)}</noframes></head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it("round-six F1 ends scripting-enabled noscript raw text at the first matching end tag", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-six-noscript-first-end-tag.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head><noscript><noscript></noscript><script>void 0</script></noscript>${cspMeta(VALID_CSP_POLICY)}</head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_META_TOO_LATE");
  });

  it("round-six F1 treats link imagesrcset as resource-loading content", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-six-imagesrcset-preload.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head><link rel="preload" as="image" imagesrcset="https://example.invalid/x.png 1x">${cspMeta(VALID_CSP_POLICY)}</head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_META_TOO_LATE");
  });

  it.each([
    ["tab", "&tab;"],
    ["newline", "&newline;"],
  ])("round-seven F1 keeps invalid lowercase &%s; head text literal", async (_label, reference) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-seven-lowercase-head-reference.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head>${reference}${cspMeta(VALID_CSP_POLICY)}</head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it.each([
    ["Tab", "&Tab;"],
    ["NewLine", "&NewLine;"],
  ])("round-seven F1 decodes valid &%s; head whitespace", async (_label, reference) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-seven-canonical-head-reference.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head>${reference}${cspMeta(VALID_CSP_POLICY)}</head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CSP_OK");
  });

  it.each([
    ["tab", "&tab;"],
    ["newline", "&newline;"],
  ])("round-seven F1 keeps invalid lowercase &%s; CSP attribute text literal", async (_label, reference) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-seven-lowercase-attribute-reference.html");
    await writeFile(
      artifactPath,
      htmlWithHead(cspMeta(VALID_CSP_POLICY.replace("default-src ", `default-src${reference}`))),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_REQUIRED_DIRECTIVE_MISSING: default-src");
  });

  it.each([
    ["Tab", "&Tab;"],
    ["NewLine", "&NewLine;"],
  ])("round-seven F1 decodes valid &%s; CSP attribute whitespace", async (_label, reference) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-seven-canonical-attribute-reference.html");
    await writeFile(
      artifactPath,
      htmlWithHead(cspMeta(VALID_CSP_POLICY.replace("default-src ", `default-src${reference}`))),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CSP_OK");
  });

  it.each([
    ["decimal ampersand before Tab", "&#38;Tab;"],
    ["hexadecimal ampersand before NewLine", "&#x26;NewLine;"],
  ])("round-seven F1 does not recursively decode %s in head text", async (_label, reference) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-seven-nonrecursive-head-reference.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head>${reference}${cspMeta(VALID_CSP_POLICY)}</head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it.each([
    ["decimal ampersand before Tab", "&#38;Tab;"],
    ["hexadecimal ampersand before NewLine", "&#x26;NewLine;"],
  ])("round-seven F1 does not recursively decode %s in a CSP attribute", async (_label, reference) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-seven-nonrecursive-attribute-reference.html");
    await writeFile(
      artifactPath,
      htmlWithHead(cspMeta(VALID_CSP_POLICY.replace("default-src ", `default-src${reference}`))),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_REQUIRED_DIRECTIVE_MISSING: default-src");
  });

  it("round-seven F6 processes title through the head pointer after head", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-seven-after-head-title.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head></head><title>Prompt Studio</title>${cspMeta(VALID_CSP_POLICY)}<body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CSP_OK");
  });

  it("round-eight F1 does not count a CSP lookalike in double-escaped script data", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-eight-double-escaped-script-data.html");
    await writeFile(
      artifactPath,
      `<!doctype html><html><head>${cspMeta(VALID_CSP_POLICY)}<script><!--<script></script>${cspMeta(VALID_CSP_POLICY)}\nvoid 0;</script></head><body></body></html>`,
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CSP_OK");
  });

  it.each([
    ["SVG", "svg"],
    ["MathML", "math"],
  ])("round-twelve F1 ignores a CSP lookalike inside template %s CDATA", async (
    _label,
    name,
  ) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-twelve-template-foreign-cdata.html");
    await writeFile(
      artifactPath,
      [
        "<!doctype html><html><head>",
        `<template><${name}><![CDATA[ignored ></template>${cspMeta(VALID_CSP_POLICY)}]]></${name}></template>`,
        "</head><body></body></html>",
      ].join(""),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it.each([
    ["SVG", "svg"],
    ["MathML", "math"],
  ])("round-twelve F2 keeps a CSP lookalike inert after an unquoted %s attribute value", async (
    _label,
    name,
  ) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-twelve-unquoted-foreign-attribute.html");
    await writeFile(
      artifactPath,
      [
        "<!doctype html><html><head>",
        `<template><${name} data-kind=icon/><![CDATA[ignored ></template>${cspMeta(VALID_CSP_POLICY)}]]></${name}></template>`,
        "</head><body></body></html>",
      ].join(""),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CSP_POLICY_COUNT_INVALID: found 0");
  });

  it("round-twelve F3 keeps a CSP lookalike inert after double-escaped dashes", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-twelve-double-escaped-dashes.html");
    await writeFile(
      artifactPath,
      htmlWithHead([
        cspMeta(VALID_CSP_POLICY),
        `<script><!--<script>--></script>${cspMeta(VALID_CSP_POLICY)}</script>`,
      ].join("")),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CSP_OK");
  });

  it.each([
    ["an abruptly closed empty comment", "<!-->"],
    ["an incorrectly closed comment", "<!--ignored--!>"],
  ])("round-ten F2 recognizes a real CSP policy after %s", async (_label, comment) => {
    const directory = await createTemporaryDirectory();
    const artifactPath = join(directory, "round-ten-abrupt-comment-close.html");
    await writeFile(
      artifactPath,
      htmlWithHead(`${comment}${cspMeta(VALID_CSP_POLICY)}`),
      "utf8",
    );

    const result = await runNode("scripts/verify-csp.mjs", [artifactPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CSP_OK");
  });
});

function cspMeta(policy: string): string {
  return `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
}

function htmlWithHead(content: string): string {
  return `<!doctype html><html><head>${content}</head><body></body></html>`;
}

interface CommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
}

interface V600ArtifactOverrides {
  readonly appVersion?: string;
  readonly body?: string;
  readonly databaseSchemaVersion?: number;
  readonly pluginApiVersion?: number;
  readonly script?: string;
  readonly scriptAttributes?: string;
}

interface TestPngOptions {
  readonly bitDepth?: number;
  readonly colorType?: number;
  readonly duplicateIhdr?: boolean;
  readonly height?: number;
  readonly idatData?: Buffer;
  readonly interlace?: number;
  readonly omitIdat?: boolean;
  readonly omitIend?: boolean;
  readonly rawData?: Buffer;
  readonly seed?: number;
  readonly solid?: boolean;
  readonly width?: number;
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
  timeout?: number,
): Promise<CommandResult> {
  const absoluteScriptPath = resolve(scriptPath);
  try {
    const result = await execFileAsync(process.execPath, [absoluteScriptPath, ...arguments_], {
      cwd: workingDirectory,
      timeout,
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr, timedOut: false };
  } catch (error: unknown) {
    if (!isExecutionError(error)) {
      throw error;
    }

    return {
      exitCode: typeof error.code === "number" ? error.code : 1,
      stdout: typeof error.stdout === "string" ? error.stdout : "",
      stderr: typeof error.stderr === "string" ? error.stderr : String(error),
      timedOut: error.killed === true,
    };
  }
}

function isExecutionError(
  error: unknown,
): error is Error & {
  readonly code?: number | string;
  readonly killed?: boolean;
  readonly stdout?: string;
  readonly stderr?: string;
} {
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

async function runScriptAudit(
  script: string,
  timeout?: number,
  scriptAttributes?: string,
): Promise<CommandResult> {
  const fixture = await writeV600AuditFixture({ artifact: { script, scriptAttributes } });
  return runNode("scripts/verify-source-integrity.mjs", [
    "--artifact",
    fixture.artifactPath,
    "--report",
    fixture.evidencePath,
    "--source-root",
    fixture.sourceRoot,
  ], undefined, timeout);
}

async function runEvidenceAudit(safariDataUri: string): Promise<CommandResult> {
  const evidence = COMPLETE_IPHONE_EVIDENCE.replace(
    SAFARI_SCREENSHOT_DATA,
    safariDataUri,
  );
  return runV600Audit(await writeV600AuditFixture({ evidence }));
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
  const scriptAttributes = overrides.scriptAttributes === undefined
    ? ""
    : ` ${overrides.scriptAttributes}`;

  return `<!doctype html><html><head><title>Prompt Studio V600</title><script id="prompt-studio-build-metadata" type="application/json">${JSON.stringify({ appVersion, databaseSchemaVersion, pluginApiVersion })}</script></head><body>${body}<script${scriptAttributes}>${script}</script></body></html>`;
}

function createTestPng(options: TestPngOptions = {}): Buffer {
  const width = options.width ?? 640;
  const height = options.height ?? 1000;
  const bitDepth = options.bitDepth ?? 8;
  const colorType = options.colorType ?? 2;
  const interlace = options.interlace ?? 0;
  const channels = colorType === 6 ? 4 : 3;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = interlace;

  const ihdrChunk = pngChunk("IHDR", ihdr);
  const chunks = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ihdrChunk,
  ];
  if (options.duplicateIhdr) chunks.push(ihdrChunk);
  if (!options.omitIdat) {
    const rawData = options.rawData ?? createTestScanlines(
      width,
      height,
      options.seed ?? 11,
      channels,
      options.solid ?? false,
    );
    chunks.push(pngChunk("IDAT", options.idatData ?? deflateSync(rawData)));
  }
  if (!options.omitIend) chunks.push(pngChunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function createTestScanlines(
  width: number,
  height: number,
  seed: number,
  channels: number,
  solid = false,
): Buffer {
  const rowLength = width * channels;
  const scanlines = Buffer.alloc(height * (rowLength + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (rowLength + 1);
    scanlines[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixelStart = rowStart + 1 + x * channels;
      const bandX = solid ? 0 : Math.floor(x / 32);
      const bandY = solid ? 0 : Math.floor(y / 50);
      scanlines[pixelStart] = (seed + bandX * 37 + bandY * 13) & 0xff;
      scanlines[pixelStart + 1] = (seed * 3 + bandX * 11 + bandY * 41) & 0xff;
      scanlines[pixelStart + 2] = (seed * 7 + bandX * 23 + bandY * 17) & 0xff;
      if (channels === 4) {
        scanlines[pixelStart + 3] = solid
          ? 0xff
          : 0x80 + ((seed + bandX * 5 + bandY * 7) & 0x7f);
      }
    }
  }
  return scanlines;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function corruptFirstIdatByte(png: Buffer): Buffer {
  const corrupted = Buffer.from(png);
  for (let offset = 8; offset + 12 <= corrupted.length;) {
    const length = corrupted.readUInt32BE(offset);
    if (corrupted.subarray(offset + 4, offset + 8).toString("ascii") === "IDAT") {
      corrupted[offset + 8] ^= 0x01;
      return corrupted;
    }
    offset += 12 + length;
  }
  throw new Error("test PNG has no IDAT chunk");
}

function replaceFirstPngChunkType(
  png: Buffer,
  currentType: string,
  replacementType: Buffer,
): Buffer {
  if (replacementType.length !== 4) throw new Error("replacement PNG type must be four bytes");
  const updated = Buffer.from(png);
  for (let offset = 8; offset + 12 <= updated.length;) {
    const length = updated.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (updated.subarray(typeStart, dataStart).toString("ascii") === currentType) {
      replacementType.copy(updated, typeStart);
      updated.writeUInt32BE(
        crc32(updated.subarray(typeStart, dataEnd)),
        dataEnd,
      );
      return updated;
    }
    offset += 12 + length;
  }
  throw new Error(`test PNG has no ${currentType} chunk`);
}

function insertPngChunkBefore(png: Buffer, beforeType: string, chunk: Buffer): Buffer {
  for (let offset = 8; offset + 12 <= png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.subarray(offset + 4, offset + 8).toString("ascii") === beforeType) {
      return Buffer.concat([png.subarray(0, offset), chunk, png.subarray(offset)]);
    }
    offset += 12 + length;
  }
  throw new Error(`test PNG has no ${beforeType} chunk`);
}

function makeRgbaScanlinesTransparent(
  scanlines: Buffer,
  width: number,
  height: number,
): void {
  const rowLength = width * 4;
  for (let row = 0; row < height; row += 1) {
    const rowStart = row * (rowLength + 1) + 1;
    for (let column = 0; column < width; column += 1) {
      scanlines[rowStart + column * 4 + 3] = 0;
    }
  }
}

function createSparseVariationScanlines(width: number, height: number): Buffer {
  const channels = 3;
  const rowLength = width * channels;
  const scanlines = Buffer.alloc(height * (rowLength + 1));
  for (let row = 0; row < height; row += 1) {
    scanlines[row * (rowLength + 1)] = 0;
  }
  for (let pixel = 0; pixel < 32; pixel += 1) {
    const cellX = pixel % 8;
    const cellY = Math.floor(pixel / 8);
    const x = Math.floor(((cellX + 0.5) * width) / 8);
    const y = Math.floor(((cellY + 0.5) * height) / 8);
    const offset = y * (rowLength + 1) + 1 + x * channels;
    scanlines[offset] = pixel + 1;
    scanlines[offset + 1] = pixel * 3;
    scanlines[offset + 2] = pixel * 7;
  }
  return scanlines;
}

function createLineVariationScanlines(
  width: number,
  height: number,
  direction: "horizontal" | "vertical",
): Buffer {
  const channels = 3;
  const rowLength = width * channels;
  const scanlines = Buffer.alloc(height * (rowLength + 1));
  for (let row = 0; row < height; row += 1) {
    scanlines[row * (rowLength + 1)] = 0;
  }
  const lineLength = direction === "horizontal" ? width : height;
  for (let index = 0; index < lineLength; index += 1) {
    const x = direction === "horizontal" ? index : Math.floor(width / 2);
    const y = direction === "horizontal" ? Math.floor(height / 2) : index;
    const offset = y * (rowLength + 1) + 1 + x * channels;
    scanlines[offset] = 1 + (index % 251);
    scanlines[offset + 1] = 1 + ((index * 3) % 251);
    scanlines[offset + 2] = 1 + ((index * 7) % 251);
  }
  return scanlines;
}

function createEdgeVariationScanlines(
  width: number,
  height: number,
  thickness: number,
): Buffer {
  const channels = 3;
  const rowLength = width * channels;
  const scanlines = Buffer.alloc(height * (rowLength + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (rowLength + 1);
    scanlines[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      if (
        x >= thickness &&
        x < width - thickness &&
        y >= thickness &&
        y < height - thickness
      ) {
        continue;
      }
      const offset = rowStart + 1 + x * channels;
      scanlines[offset] = 1 + ((x + y) % 251);
      scanlines[offset + 1] = 1 + ((x * 3 + y * 5) % 251);
      scanlines[offset + 2] = 1 + ((x * 7 + y * 11) % 251);
    }
  }
  return scanlines;
}

function pngDataUri(bytes: Buffer): string {
  return embeddedImageDataUri("png", bytes);
}

function fakeJpegDataUri(): string {
  const bytes = Buffer.alloc(24);
  bytes.set([0xff, 0xd8, 0xff, 0xe0], 0);
  bytes.write("JFIF", 6, "ascii");
  bytes.set([0xff, 0xd9], bytes.length - 2);
  return embeddedImageDataUri("jpeg", bytes);
}

function fakeWebpDataUri(): string {
  const bytes = Buffer.alloc(24);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WEBP", 8, "ascii");
  return embeddedImageDataUri("webp", bytes);
}

function embeddedImageDataUri(mimeSubtype: string, bytes: Buffer): string {
  return `data:image/${mimeSubtype};base64,${bytes.toString("base64")}`;
}
