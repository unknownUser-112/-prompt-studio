import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { JsonPromptProjectionBuilder } from "../../../src/application/projections/json-prompt-projection-builder";
import type { PromptDocument } from "../../../src/domain/contracts/prompt/prompt-document";
import type { ResolvedState } from "../../../src/domain/contracts/resolved-state/resolved-state";
import { ConstraintEngine } from "../../../src/domain/engines/constraint-engine";
import { PromptAstBuilder } from "../../../src/domain/engines/prompt-ast-builder";
import { createResolvedStateBuilder } from "../../../src/domain/engines/resolved-state-builder";
import { createCanonicalProjectStateV5Values } from "../../../src/domain/entities/project-factory";
import { additionalPersonProvider } from "../../../src/plugins/additional-person/rules";
import { additionalPersonSection } from "../../../src/plugins/additional-person/sections";
import { adaptiveRealismProvider } from "../../../src/plugins/adaptive-realism/rules";
import { adaptiveRealismSection } from "../../../src/plugins/adaptive-realism/sections";
import { brandProvider } from "../../../src/plugins/brand/rules";
import { cameraProvider } from "../../../src/plugins/camera/rules";
import { cameraSection } from "../../../src/plugins/camera/sections";
import { characterSheetProvider } from "../../../src/plugins/character-sheet/rules";
import { characterSheetSection } from "../../../src/plugins/character-sheet/sections";
import { garmentProvider } from "../../../src/plugins/garment/rules";
import { garmentSection } from "../../../src/plugins/garment/sections";
import { materialPhysicsProvider } from "../../../src/plugins/material-physics/rules";
import { materialPhysicsSection } from "../../../src/plugins/material-physics/sections";
import { modelBehaviourProvider } from "../../../src/plugins/model-behaviour/rules";
import { modelBehaviourSection } from "../../../src/plugins/model-behaviour/sections";
import { sceneLightingProvider } from "../../../src/plugins/scene-lighting/rules";
import { sceneLightingSection } from "../../../src/plugins/scene-lighting/sections";
import { selfieProvider } from "../../../src/plugins/selfie/rules";
import { selfieSection } from "../../../src/plugins/selfie/sections";
import { GOLDEN_SCENARIOS } from "../../golden/scenarios";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

interface GoldenEntry { readonly scenarioId: string; readonly profileId: string; readonly output: string }
const matrix = JSON.parse(readFileSync("tests/golden/fixtures/v500.6.11/matrix.json", "utf8")) as {
  readonly entries: readonly GoldenEntry[];
};

const rules = [
  additionalPersonProvider,
  adaptiveRealismProvider,
  brandProvider,
  cameraProvider,
  characterSheetProvider,
  garmentProvider,
  materialPhysicsProvider,
  modelBehaviourProvider,
  sceneLightingProvider,
  selfieProvider,
];

const sections = [
  additionalPersonSection,
  adaptiveRealismSection,
  cameraSection,
  characterSheetSection,
  garmentSection,
  materialPhysicsSection,
  modelBehaviourSection,
  sceneLightingSection,
  selfieSection,
];

describe("JsonPromptProjectionBuilder", () => {
  it.each(GOLDEN_SCENARIOS)("projects every shared Standard/Safe JSON value: $id", async (scenario) => {
    const { state, document } = await buildScenario(scenario);
    const projection = new JsonPromptProjectionBuilder().build(document, state);
    const standard = goldenObject(scenario.id, "standardJson");
    const safe = goldenObject(scenario.id, "safeJson");

    expect(projection.documentId).toBe(document.id);
    expect(projection.mode).toBe("characterSheet" in standard ? "characterSheet" : "normal");
    expect(projection.language).toBe(standard.language);
    expect(projection.prompt).toBe(standard.prompt);
    expect(projection.instructions).toEqual(safe.instructions);
    expect(projection.negativePrompt).toEqual(standard.negativePrompt ?? safe.negativePrompt);
    expect(projection.sections).toEqual(standard.sections);
    expect(projection.metadata).toEqual(standard.metadata);
    expect(projection.structuredSelections).toEqual(standard.structuredSelections);
    expect(projection.adaptive).toEqual(standard.adaptive);
    expect(projection.resolvedState).toEqual(standard.resolvedState);
    expect(projection.characterSheet).toEqual(standard.characterSheet);
    expect(projection.photographicCapture).toEqual(standard.photographicCapture);
    expect(projection.trace).toBe(document.trace);
    expect(JSON.stringify(projection.sections)).toBe(JSON.stringify(standard.sections));
    expect(JSON.stringify(projection.metadata)).toBe(JSON.stringify(standard.metadata));
    expect(JSON.stringify(projection.structuredSelections)).toBe(JSON.stringify(standard.structuredSelections));
    expect(JSON.stringify(projection.adaptive)).toBe(JSON.stringify(standard.adaptive));
    expect(JSON.stringify(projection.resolvedState)).toBe(JSON.stringify(standard.resolvedState));
  });

  it("deep-freezes the projection and every nested collection", async () => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === "json.v5611-special.en")!;
    const { state, document } = await buildScenario(scenario);
    const projection = new JsonPromptProjectionBuilder().build(document, state);

    expectDeeplyFrozen(projection);
  });

  it("is deterministic for the same document and resolved state", async () => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === "material-physics.de")!;
    const { state, document } = await buildScenario(scenario);
    const builder = new JsonPromptProjectionBuilder();

    expect(builder.build(document, state)).toEqual(builder.build(document, state));
  });

  it("ignores normalized facts outside the explicit JSON allowlist", async () => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === "baseline.en")!;
    const baseline = await buildScenario(scenario);
    const withUnrelatedFact = await buildScenario({ ...scenario, input: { ...scenario.input, unrelatedSecret: "do-not-project" } });
    const builder = new JsonPromptProjectionBuilder();
    const baselineProjection = builder.build(baseline.document, baseline.state);
    const unrelatedProjection = builder.build(withUnrelatedFact.document, withUnrelatedFact.state);

    expect({ ...unrelatedProjection, documentId: baselineProjection.documentId })
      .toEqual(baselineProjection);
    expect(JSON.stringify(unrelatedProjection)).not.toContain("do-not-project");
  });
});

async function buildScenario(scenario: Readonly<{ language: string; input: Readonly<Record<string, unknown>> }>): Promise<{
  readonly state: ResolvedState;
  readonly document: PromptDocument;
}> {
  const promptLanguage = scenario.language === "Deutsch" ? "Deutsch" : "English";
  const state = await new ConstraintEngine({
    runtime: createFixedRuntime().runtime,
    stateBuilder: createResolvedStateBuilder(),
  }).resolve(
    { ...createCanonicalProjectStateV5Values(), ...scenario.input, promptLanguage, profile: "Standard JSON", step: 9 },
    rules,
  );
  return { state, document: new PromptAstBuilder().build(state, sections) };
}

function goldenObject(scenarioId: string, profileId: "standardJson" | "safeJson"): Readonly<Record<string, unknown>> {
  const entry = matrix.entries.find((candidate) => candidate.scenarioId === scenarioId && candidate.profileId === profileId);
  if (entry === undefined) throw new Error(`Missing Golden entry: ${scenarioId}/${profileId}`);
  return JSON.parse(entry.output) as Readonly<Record<string, unknown>>;
}

function expectDeeplyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child);
}
