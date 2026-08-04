import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_FILE = "Prompt-Studio-V600.0.0-Phase1-Foundation.html";
const OUTPUT_DIRECTORY = resolve(PROJECT_ROOT, "dist");
const OUTPUT_PATH = resolve(OUTPUT_DIRECTORY, OUTPUT_FILE);
const MAX_ARTIFACT_BYTES = 1_500_000;
const APP_VERSION = "V600.0.0-Phase1-Foundation";
const DATABASE_SCHEMA_VERSION = 1;
const PLUGIN_API_VERSION = 1;
const V500_6_11_HTML_PATH = "Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html";
const V500_6_11_REPORT_PATH = "Prompt-Studio-V500.6.11-Test-Results.json";

const [shell, styles, bundle, referenceManifest] = await Promise.all([
  readProjectFile("src/ui/shell.html"),
  readProjectFile("src/ui/styles.css"),
  bundleBootstrap(),
  readReferenceManifest(),
]);

const sourceHash = sha256(
  canonicalJson({
    "src/bootstrap/index.ts": await readProjectFile("src/bootstrap/index.ts"),
    "src/ui/shell.html": shell,
    "src/ui/styles.css": styles,
  }),
);
const metadata = canonicalJson({
  appVersion: APP_VERSION,
  databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
  pluginApiVersion: PLUGIN_API_VERSION,
  referenceReportSha256: referenceManifest.reportSha256,
  sourceHash,
  v500_6_11BaselineSha256: referenceManifest.htmlSha256,
  ...sourceDateMetadata(),
});
const artifact = inlineArtifact(shell, styles, bundle, metadata);

if (Buffer.byteLength(artifact) >= MAX_ARTIFACT_BYTES) {
  throw new Error("BUILD_ARTIFACT_SIZE_LIMIT_EXCEEDED");
}

await rm(OUTPUT_DIRECTORY, { force: true, recursive: true });
await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, artifact, "utf8");
process.stdout.write(`Built dist/${OUTPUT_FILE}\n`);

async function bundleBootstrap() {
  const result = await build({
    bundle: true,
    entryPoints: [resolve(PROJECT_ROOT, "src/bootstrap/index.ts")],
    format: "iife",
    minify: true,
    platform: "browser",
    sourcemap: false,
    target: "es2022",
    write: false,
  });
  const output = result.outputFiles[0];

  if (output === undefined) {
    throw new Error("BUILD_BUNDLE_MISSING");
  }

  return output.text.replace(/<\/script/gi, "<\\/script");
}

async function readReferenceManifest() {
  const value = JSON.parse(await readProjectFile("reference/v500.6.11/manifest.json"));

  if (!isRecord(value) || !Array.isArray(value.artifacts)) {
    throw new Error("BUILD_REFERENCE_MANIFEST_INVALID");
  }

  return {
    htmlSha256: artifactSha256(value.artifacts, V500_6_11_HTML_PATH),
    reportSha256: artifactSha256(value.artifacts, V500_6_11_REPORT_PATH),
  };
}

function artifactSha256(artifacts, sourcePath) {
  const artifact = artifacts.find(
    (candidate) =>
      isRecord(candidate) &&
      candidate.sourcePath === sourcePath &&
      typeof candidate.sha256 === "string" &&
      /^[a-f0-9]{64}$/.test(candidate.sha256),
  );

  if (artifact === undefined || !isRecord(artifact) || typeof artifact.sha256 !== "string") {
    throw new Error("BUILD_REFERENCE_MANIFEST_INVALID");
  }

  return artifact.sha256;
}

function inlineArtifact(shellTemplate, stylesText, scriptText, metadataJson) {
  return replaceExactlyOnce(
    replaceExactlyOnce(
      replaceExactlyOnce(
        shellTemplate,
        "<!-- BUILD_METADATA -->",
        `<script id="prompt-studio-build-metadata" type="application/json">${metadataJson}</script>`,
      ),
      "/* INLINE_STYLES */",
      stylesText,
    ),
    "/* INLINE_SCRIPT */",
    scriptText,
  );
}

function replaceExactlyOnce(value, token, replacement) {
  const firstIndex = value.indexOf(token);

  if (firstIndex === -1 || firstIndex !== value.lastIndexOf(token)) {
    throw new Error("BUILD_SHELL_TEMPLATE_INVALID");
  }

  return value.replace(token, replacement);
}

function sourceDateMetadata() {
  const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH;

  if (sourceDateEpoch === undefined) {
    return {};
  }

  if (!/^(?:0|[1-9][0-9]*)$/.test(sourceDateEpoch)) {
    throw new Error("BUILD_SOURCE_DATE_EPOCH_INVALID");
  }

  const milliseconds = Number(sourceDateEpoch) * 1_000;

  if (!Number.isSafeInteger(milliseconds)) {
    throw new Error("BUILD_SOURCE_DATE_EPOCH_INVALID");
  }

  return { builtAt: new Date(milliseconds).toISOString() };
}

function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
}

function sortCanonical(value) {
  if (Array.isArray(value)) {
    return value.map(sortCanonical);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, nestedValue]) => [key, sortCanonical(nestedValue)]),
    );
  }

  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProjectFile(relativePath) {
  return readFile(resolve(PROJECT_ROOT, relativePath), "utf8");
}
