import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import { withAuthoritativeV500 } from "./v500-harness";

const REPORT_PATH = resolve(
  "reference/v500.6.11/Prompt-Studio-V500.6.11-Test-Results.json",
);

const TARGETED_REGRESSIONS = [
  { id: "v5611.gemini-natural.selfie-binding", expected: true },
  { id: "v5611.gemini-pro.selfie-binding", expected: true },
  { id: "v5611.universal.selfie-binding", expected: true },
  { id: "v5611.selfie.no-main-camera-conflict", expected: true },
  { id: "v5611.selfie.disabled-clean", expected: true },
  { id: "v5611.open-garment.gemini-natural", expected: true },
  { id: "v5611.open-garment.gemini-pro", expected: true },
  { id: "v5611.closed-garment.no-state-block", expected: true },
  { id: "v5611.json.compact-unchanged", expected: true },
  { id: "v5611.gate.binding-required", expected: true },
  { id: "v5611.removed-terms-still-clean", expected: true },
] as const;

interface TargetedReportRow {
  readonly id: string;
  readonly ok: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTargetedReportRows(source: string): readonly TargetedReportRow[] {
  const parsed = JSON.parse(source) as unknown;
  if (!isRecord(parsed) || !isRecord(parsed.targetedVmRegression)) {
    throw new Error("Reference report has no targetedVmRegression object");
  }
  const tests = parsed.targetedVmRegression.tests;
  if (!Array.isArray(tests)) {
    throw new Error("Reference report targetedVmRegression.tests is not an array");
  }
  return tests.map((value, index) => {
    if (!isRecord(value) || typeof value.id !== "string") {
      throw new Error(`Targeted regression row ${index} has no string id`);
    }
    if (typeof value.ok !== "boolean") {
      throw new Error(`Targeted regression row ${index} has no boolean ok`);
    }
    return { id: value.id, ok: value.ok };
  });
}

const reportRows = parseTargetedReportRows(readFileSync(REPORT_PATH, "utf8"));
const expectedIds = TARGETED_REGRESSIONS.map(({ id }) => id).toSorted();
const reportIds = reportRows.map(({ id }) => id).toSorted();

if (reportRows.length !== 11 || new Set(reportIds).size !== 11) {
  throw new Error("Reference report must contain exactly 11 unique targeted IDs");
}
if (JSON.stringify(reportIds) !== JSON.stringify(expectedIds)) {
  throw new Error("Reference report targeted ID set does not match V500.6.11 gate");
}
for (const row of reportRows) {
  if (row.ok !== true) {
    throw new Error(`Reference report regression ${row.id} is not ok === true`);
  }
}

for (const regression of TARGETED_REGRESSIONS) {
  test(regression.id, async ({ browser }) => {
    const actual = await withAuthoritativeV500(
      browser,
      "en-US",
      async (harness) => harness.runTargetedRegression(regression.id),
    );

    expect(actual).toEqual({ id: regression.id, ok: regression.expected });
  });
}
