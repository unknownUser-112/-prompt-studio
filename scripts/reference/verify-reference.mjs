import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MISMATCH_CODE = "REFERENCE_INTEGRITY_MISMATCH";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ROLES = new Set(["authoritative", "historical"]);

export class ReferenceIntegrityError extends Error {
  constructor(message) {
    super(message);
    this.code = MISMATCH_CODE;
    this.name = "ReferenceIntegrityError";
  }
}

function mismatch(message) {
  throw new ReferenceIntegrityError(message);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCanonicalRelativePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.includes("\\") &&
    path.posix.normalize(value) === value &&
    !value.split("/").includes("..")
  );
}

function validateTestCounts(value, label) {
  if (!isRecord(value)) {
    mismatch(`${label} must be an object`);
  }

  for (const [name, count] of Object.entries(value)) {
    if (isRecord(count)) {
      validateTestCounts(count, `${label}.${name}`);
      continue;
    }

    if (!Number.isSafeInteger(count) || count < 0) {
      mismatch(`${label}.${name} must be a non-negative integer`);
    }
  }
}

function validateArtifact(value, manifestRole, index) {
  const label = `artifacts[${index}]`;
  if (!isRecord(value)) {
    mismatch(`${label} must be an object`);
  }

  const { sourcePath, referencePath, bytes, lines, sha256, role } = value;
  if (!isCanonicalRelativePath(sourcePath)) {
    mismatch(`${label}.sourcePath must be a canonical relative path`);
  }
  if (!isCanonicalRelativePath(referencePath)) {
    mismatch(`${label}.referencePath must be a canonical relative path`);
  }
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    mismatch(`${label}.bytes must be a non-negative integer`);
  }
  if (!Number.isSafeInteger(lines) || lines < 0) {
    mismatch(`${label}.lines must be a non-negative integer`);
  }
  if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
    mismatch(`${label}.sha256 must be a lowercase SHA-256 digest`);
  }
  if (role !== manifestRole) {
    mismatch(`${label}.role must equal the manifest role`);
  }

  return { sourcePath, referencePath, bytes, lines, sha256, role };
}

function validateManifest(value) {
  if (!isRecord(value)) {
    mismatch("manifest must be an object");
  }

  const { role, expectedReferenceTestCounts, artifacts } = value;
  if (typeof role !== "string" || !ROLES.has(role)) {
    mismatch("manifest.role must be authoritative or historical");
  }
  validateTestCounts(expectedReferenceTestCounts, "manifest.expectedReferenceTestCounts");
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    mismatch("manifest.artifacts must be a non-empty array");
  }

  return {
    role,
    expectedReferenceTestCounts,
    artifacts: artifacts.map((artifact, index) => validateArtifact(artifact, role, index)),
  };
}

function countLines(bytes) {
  let lines = 0;
  for (const byte of bytes) {
    if (byte === 10) {
      lines += 1;
    }
  }
  return lines;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function resolveRepositoryPath(relativePath) {
  const absolutePath = path.resolve(REPOSITORY_ROOT, relativePath);
  if (path.relative(REPOSITORY_ROOT, absolutePath).startsWith("..")) {
    mismatch(`path escapes repository root: ${relativePath}`);
  }
  return absolutePath;
}

async function readBytes(relativePath) {
  try {
    return await readFile(resolveRepositoryPath(relativePath));
  } catch {
    mismatch(`cannot read ${relativePath}`);
  }
}

function verifyArtifactMetadata(artifact, sourceBytes, referenceBytes) {
  if (path.basename(artifact.sourcePath) !== path.basename(artifact.referencePath)) {
    mismatch(`filename mismatch for ${artifact.sourcePath}`);
  }
  if (sourceBytes.length !== artifact.bytes) {
    mismatch(`source byte size mismatch for ${artifact.sourcePath}`);
  }
  if (referenceBytes.length !== artifact.bytes) {
    mismatch(`reference byte size mismatch for ${artifact.referencePath}`);
  }
  if (countLines(sourceBytes) !== artifact.lines) {
    mismatch(`source line count mismatch for ${artifact.sourcePath}`);
  }
  if (countLines(referenceBytes) !== artifact.lines) {
    mismatch(`reference line count mismatch for ${artifact.referencePath}`);
  }
  if (sha256(sourceBytes) !== artifact.sha256) {
    mismatch(`source hash mismatch for ${artifact.sourcePath}`);
  }
  if (sha256(referenceBytes) !== artifact.sha256) {
    mismatch(`reference hash mismatch for ${artifact.referencePath}`);
  }
  if (!sourceBytes.equals(referenceBytes)) {
    mismatch(`byte mismatch for ${artifact.referencePath}`);
  }
}

export async function verifyReferenceManifest(manifestPath) {
  if (!isCanonicalRelativePath(manifestPath)) {
    mismatch("manifest path must be a canonical relative path");
  }

  let manifestData;
  try {
    manifestData = JSON.parse((await readBytes(manifestPath)).toString("utf8"));
  } catch (error) {
    if (error instanceof ReferenceIntegrityError) {
      throw error;
    }
    mismatch(`cannot parse ${manifestPath}`);
  }

  const manifest = validateManifest(manifestData);
  const artifacts = [];
  for (const artifact of manifest.artifacts) {
    const sourceBytes = await readBytes(artifact.sourcePath);
    const referenceBytes = await readBytes(artifact.referencePath);
    verifyArtifactMetadata(artifact, sourceBytes, referenceBytes);
    artifacts.push({
      fileName: path.basename(artifact.sourcePath),
      bytes: artifact.bytes,
      lines: artifact.lines,
      sha256: artifact.sha256,
      role: artifact.role,
    });
  }

  return {
    role: manifest.role,
    expectedReferenceTestCounts: manifest.expectedReferenceTestCounts,
    artifacts,
  };
}

async function runCli() {
  const manifestPaths = process.argv.slice(2);
  const paths = manifestPaths.length > 0
    ? manifestPaths
    : ["reference/v500.6.11/manifest.json", "reference/historical/v500.6.1/manifest.json"];
  const results = [];
  for (const manifestPath of paths) {
    results.push(await verifyReferenceManifest(manifestPath));
  }
  const artifactCount = results.reduce((count, result) => count + result.artifacts.length, 0);
  process.stdout.write(`Verified ${artifactCount} reference artifacts.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    const code = error instanceof ReferenceIntegrityError ? error.code : MISMATCH_CODE;
    process.stderr.write(`${code}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
