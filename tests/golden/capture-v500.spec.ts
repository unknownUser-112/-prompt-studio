import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import { captureAuthoritativeMatrix } from "./v500-harness";

test("captures the authoritative 24 by 9 V500.6.11 matrix", async ({
  browser,
}) => {
  const outputPath = process.env.GOLDEN_CAPTURE_OUTPUT;
  if (!outputPath) {
    throw new Error("GOLDEN_CAPTURE_OUTPUT must name the temporary capture file");
  }

  const matrix = await captureAuthoritativeMatrix(browser);

  expect(matrix.selfTests).toEqual({
    passed: 941,
    total: 941,
    errors: 0,
    warnings: 0,
    failed: [],
  });
  expect(matrix.scenarioCount).toBe(24);
  expect(matrix.profileCount).toBe(9);
  expect(matrix.combinationCount).toBe(216);
  expect(matrix.entries).toHaveLength(216);
  expect(matrix.entries.every(({ released }) => released)).toBe(true);

  await writeFile(
    resolve(outputPath),
    `${JSON.stringify(matrix, null, 2)}\n`,
    "utf8",
  );
});
