import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { GOLDEN_PROFILES } from "./profiles";
import { GOLDEN_SCENARIOS } from "./scenarios";

const FIXTURE_ROOT = resolve("tests/golden/fixtures");
const MATRIX_PATH = resolve(FIXTURE_ROOT, "v500.6.11/matrix.json");
const MANIFEST_PATH = resolve(FIXTURE_ROOT, "manifest.json");
const SHA_256_PATTERN = /^[a-f0-9]{64}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(path: string): Promise<unknown> {
  const source = await readFile(path, "utf8");
  return JSON.parse(source) as unknown;
}

describe("V500.6.11 golden-master manifest", () => {
  it("declares exactly 24 stable scenarios and the nine authoritative profiles", () => {
    const scenarioIds = GOLDEN_SCENARIOS.map(({ id }) => id);
    const profileIds = GOLDEN_PROFILES.map(({ id }) => id);

    expect(scenarioIds).toHaveLength(24);
    expect(new Set(scenarioIds).size).toBe(24);
    expect(profileIds).toEqual([
      "universal",
      "geminiNatural",
      "geminiPro",
      "nanoBananaPro",
      "gptImage2",
      "flux",
      "sdxl",
      "standardJson",
      "safeJson",
    ]);
    expect(new Set(profileIds).size).toBe(9);
  });

  it("contains exactly 216 byte-verifiable scenario/profile results", async () => {
    const matrixBytes = await readFile(MATRIX_PATH);
    const matrix = JSON.parse(matrixBytes.toString("utf8")) as unknown;
    const manifest = await readJson(MANIFEST_PATH);

    expect(isRecord(matrix)).toBe(true);
    expect(isRecord(manifest)).toBe(true);
    if (!isRecord(matrix) || !isRecord(manifest)) return;

    expect(matrix.scenarioCount).toBe(24);
    expect(matrix.profileCount).toBe(9);
    expect(matrix.combinationCount).toBe(216);
    expect(matrix.timezone).toBe("Europe/Berlin");
    expect(Array.isArray(matrix.entries)).toBe(true);
    if (!Array.isArray(matrix.entries)) return;

    const expectedKeys = new Set(
      GOLDEN_SCENARIOS.flatMap((scenario) =>
        GOLDEN_PROFILES.map((profile) => `${scenario.id}\u0000${profile.id}`),
      ),
    );
    const actualKeys = new Set<string>();

    for (const entryValue of matrix.entries) {
      expect(isRecord(entryValue)).toBe(true);
      if (!isRecord(entryValue)) continue;
      const scenarioId = entryValue.scenarioId;
      const profileId = entryValue.profileId;
      const output = entryValue.output;
      const length = entryValue.length;
      const sha256 = entryValue.sha256;
      const maxLength = entryValue.maxLength;
      const resolvedState = entryValue.resolvedState;

      expect(typeof scenarioId).toBe("string");
      expect(typeof profileId).toBe("string");
      expect(typeof output).toBe("string");
      expect(typeof length).toBe("number");
      expect(typeof maxLength).toBe("number");
      expect(typeof sha256).toBe("string");
      if (
        typeof scenarioId !== "string" ||
        typeof profileId !== "string" ||
        typeof output !== "string" ||
        typeof length !== "number" ||
        typeof maxLength !== "number" ||
        typeof sha256 !== "string"
      ) {
        continue;
      }

      expect(actualKeys.has(`${scenarioId}\u0000${profileId}`)).toBe(false);
      actualKeys.add(`${scenarioId}\u0000${profileId}`);
      expect(length).toBe(output.length);
      expect(length).toBeLessThanOrEqual(maxLength);
      expect(sha256).toMatch(SHA_256_PATTERN);
      expect(sha256).toBe(
        createHash("sha256").update(output, "utf8").digest("hex"),
      );
      expect(entryValue.released).toBe(true);
      expect(isRecord(resolvedState)).toBe(true);
      if (isRecord(resolvedState)) {
        expect(resolvedState.unresolvedConflicts).toBe(0);
      }

      const profile = GOLDEN_PROFILES.find(({ id }) => id === profileId);
      expect(profile).toBeDefined();
      if (profile?.kind === "json") {
        const parsed = JSON.parse(output) as unknown;
        expect(entryValue.compactJsonLength).toBe(
          JSON.stringify(parsed).length,
        );
      } else {
        expect(entryValue.compactJsonLength).toBeNull();
      }
      expect(typeof entryValue.qualityGateState).toBe("string");
      expect(entryValue.qualityGateState).not.toBe("Ausgabe blockiert");
    }

    expect(actualKeys).toEqual(expectedKeys);
    expect(matrix.entries).toHaveLength(216);

    const fixture = manifest.fixture;
    expect(isRecord(fixture)).toBe(true);
    if (!isRecord(fixture)) return;
    expect(fixture.path).toBe("v500.6.11/matrix.json");
    expect(fixture.bytes).toBe(matrixBytes.byteLength);
    expect(fixture.sha256).toBe(
      createHash("sha256").update(matrixBytes).digest("hex"),
    );
  });
});
