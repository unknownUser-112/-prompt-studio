import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const MATRIX_PATH = resolve(
  PROJECT_ROOT,
  "tests/golden/fixtures/v500.6.11/matrix.json",
);
const MANIFEST_PATH = resolve(
  PROJECT_ROOT,
  "tests/golden/fixtures/manifest.json",
);
const HTML_PATH = resolve(
  PROJECT_ROOT,
  "reference/v500.6.11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html",
);
const REPORT_PATH = resolve(
  PROJECT_ROOT,
  "reference/v500.6.11/Prompt-Studio-V500.6.11-Test-Results.json",
);
const PLAYWRIGHT_CLI = resolve(PROJECT_ROOT, "node_modules/playwright/cli.js");
const EXPECTED_HTML_SHA256 =
  "d1c2a292d203c8f76116b8b0a330bf677be394f86e044706cc3675a7326ac5c7";
const EXPECTED_REPORT_SHA256 =
  "67e71ecb3f401c5d892b4cd21fa1a0f31ab4c858bb35642866e077f244167a63";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMatrix(bytes) {
  const parsed = JSON.parse(bytes.toString("utf8"));
  if (!isRecord(parsed)) throw new Error("Captured matrix is not an object");
  if (
    parsed.scenarioCount !== 24 ||
    parsed.profileCount !== 9 ||
    parsed.combinationCount !== 216 ||
    !Array.isArray(parsed.entries) ||
    parsed.entries.length !== 216
  ) {
    throw new Error("Captured matrix is not exactly 24 scenarios by 9 profiles");
  }
  if (
    !isRecord(parsed.selfTests) ||
    parsed.selfTests.passed !== 941 ||
    parsed.selfTests.total !== 941 ||
    parsed.selfTests.errors !== 0 ||
    parsed.selfTests.warnings !== 0 ||
    !Array.isArray(parsed.selfTests.failed) ||
    parsed.selfTests.failed.length !== 0
  ) {
    throw new Error("Captured matrix does not prove 941/941 self-tests");
  }
  const keys = new Set();
  for (const [index, entry] of parsed.entries.entries()) {
    if (
      !isRecord(entry) ||
      typeof entry.scenarioId !== "string" ||
      typeof entry.profileId !== "string" ||
      typeof entry.output !== "string" ||
      entry.released !== true
    ) {
      throw new Error(`Captured matrix entry ${index} is invalid or blocked`);
    }
    keys.add(`${entry.scenarioId}\u0000${entry.profileId}`);
  }
  if (keys.size !== 216) {
    throw new Error(`Captured matrix has only ${keys.size} unique combinations`);
  }
  return parsed;
}

async function runCapture(outputPath) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [
        PLAYWRIGHT_CLI,
        "test",
        "tests/golden/capture-v500.spec.ts",
        "--project=chromium",
      ],
      {
        cwd: PROJECT_ROOT,
        env: { ...process.env, GOLDEN_CAPTURE_OUTPUT: outputPath },
        stdio: "inherit",
      },
    );
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else {
        rejectPromise(
          new Error(
            `Playwright capture exited with code ${String(code)} and signal ${String(signal)}`,
          ),
        );
      }
    });
  });
}

async function sourceRecord(path, relativePath, expectedSha256) {
  const bytes = await readFile(path);
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `Authoritative source ${relativePath} changed: ${actualSha256}`,
    );
  }
  return { path: relativePath, bytes: bytes.byteLength, sha256: actualSha256 };
}

function canonicalJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requireCanonicalCapture(bytes, matrix) {
  const canonical = canonicalJson(matrix);
  if (!bytes.equals(canonical)) {
    throw new Error("Playwright capture is not canonical UTF-8 JSON with LF ending");
  }
}

async function buildManifest(matrixBytes, matrix) {
  const html = await sourceRecord(
    HTML_PATH,
    "reference/v500.6.11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html",
    EXPECTED_HTML_SHA256,
  );
  const report = await sourceRecord(
    REPORT_PATH,
    "reference/v500.6.11/Prompt-Studio-V500.6.11-Test-Results.json",
    EXPECTED_REPORT_SHA256,
  );
  if (!isRecord(matrix.source) || matrix.source.sha256 !== html.sha256) {
    throw new Error("Captured matrix source hash does not match authoritative HTML");
  }
  return {
    schemaVersion: 1,
    referenceVersion: "V500.6.11",
    sources: [html, report],
    scenarioCount: matrix.scenarioCount,
    profileCount: matrix.profileCount,
    combinationCount: matrix.combinationCount,
    scenarioIds: matrix.scenarioIds,
    profileIds: matrix.profileIds,
    fixture: {
      path: "v500.6.11/matrix.json",
      bytes: matrixBytes.byteLength,
      sha256: sha256(matrixBytes),
    },
  };
}

async function verifyExisting(matrixBytes, manifestBytes) {
  const [existingMatrix, existingManifest] = await Promise.all([
    readFile(MATRIX_PATH),
    readFile(MANIFEST_PATH),
  ]);
  if (!existingMatrix.equals(matrixBytes)) {
    throw new Error("Regenerated matrix.json is not byte-identical");
  }
  if (!existingManifest.equals(manifestBytes)) {
    throw new Error("Regenerated manifest.json is not byte-identical");
  }
}

const argumentsSet = new Set(process.argv.slice(2));
const allowedArguments = new Set(["--verify-existing"]);
for (const argument of argumentsSet) {
  if (!allowedArguments.has(argument)) {
    throw new Error(`Unknown argument: ${argument}`);
  }
}
const verify = argumentsSet.has("--verify-existing");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "prompt-studio-golden-"));
const capturePath = join(temporaryDirectory, "matrix.json");

try {
  await runCapture(capturePath);
  const matrixBytes = await readFile(capturePath);
  const matrix = parseMatrix(matrixBytes);
  requireCanonicalCapture(matrixBytes, matrix);
  const manifest = await buildManifest(matrixBytes, matrix);
  const manifestBytes = canonicalJson(manifest);

  if (verify) {
    await verifyExisting(matrixBytes, manifestBytes);
    console.log(
      `Verified 216/216 golden combinations; matrix SHA-256 ${manifest.fixture.sha256}.`,
    );
  } else {
    await mkdir(dirname(MATRIX_PATH), { recursive: true });
    await writeFile(MATRIX_PATH, matrixBytes);
    await writeFile(MANIFEST_PATH, manifestBytes);
    console.log(
      `Captured 216/216 golden combinations; matrix SHA-256 ${manifest.fixture.sha256}.`,
    );
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
