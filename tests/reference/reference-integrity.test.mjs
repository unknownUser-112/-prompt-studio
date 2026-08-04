import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { verifyReferenceManifest } from "../../scripts/reference/verify-reference.mjs";

const EXPECTED_ARTIFACTS = [
  {
    fileName: "Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html",
    bytes: 779221,
    sha256: "d1c2a292d203c8f76116b8b0a330bf677be394f86e044706cc3675a7326ac5c7",
  },
  {
    fileName: "Prompt-Studio-V500.6.11-Test-Results.json",
    bytes: 3319,
    sha256: "67e71ecb3f401c5d892b4cd21fa1a0f31ab4c858bb35642866e077f244167a63",
  },
  {
    fileName: "Prompt-Studio-V500.6.1-Compiler-Language-Integrity-Fix.html",
    bytes: 634676,
    sha256: "619e9a73ec2699d94fa22b8cefa5fba87c6fce14678bec036d8de98e76179199",
  },
];

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

test("verifies every approved V500 reference artifact without byte changes", async () => {
  const authoritative = await verifyReferenceManifest("reference/v500.6.11/manifest.json");
  const historical = await verifyReferenceManifest("reference/historical/v500.6.1/manifest.json");
  const actual = [...authoritative.artifacts, ...historical.artifacts].map((artifact) => ({
    fileName: artifact.fileName,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
  }));

  assert.deepEqual(actual, EXPECTED_ARTIFACTS);
});

test("reports the stable error code for a manipulated reference line count", async () => {
  const fixtureDirectory = await mkdtemp(
    path.join(REPOSITORY_ROOT, "tests/reference/.reference-integrity-"),
  );
  const manifestPath = path.join(fixtureDirectory, "manifest.json");
  const relativeManifestPath = path.relative(REPOSITORY_ROOT, manifestPath);
  const manipulatedManifest = {
    role: "authoritative",
    expectedReferenceTestCounts: { integratedSelfTests: { passed: 941, total: 941 } },
    artifacts: [
      {
        sourcePath: "Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html",
        referencePath:
          "reference/v500.6.11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html",
        bytes: 779221,
        lines: 6553,
        sha256: "d1c2a292d203c8f76116b8b0a330bf677be394f86e044706cc3675a7326ac5c7",
        role: "authoritative",
      },
    ],
  };

  try {
    await writeFile(manifestPath, JSON.stringify(manipulatedManifest), "utf8");
    await assert.rejects(
      verifyReferenceManifest(relativeManifestPath),
      { code: "REFERENCE_INTEGRITY_MISMATCH" },
    );
  } finally {
    await rm(fixtureDirectory, { force: true, recursive: true });
  }
});
