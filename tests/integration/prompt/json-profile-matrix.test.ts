import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { JsonPromptProjectionBuilder } from "../../../src/application/projections/json-prompt-projection-builder";
import type { JsonProfileLayout } from "../../../src/domain/contracts/prompt/json-layout";
import type { JsonPromptProjectionMode } from "../../../src/domain/contracts/prompt/json-projection";
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
import { createStandardJsonLayout } from "../../../src/profiles/standard-json";
import { createSafeJsonLayout } from "../../../src/profiles/safe-json";
import { JsonRenderer } from "../../../src/renderers/json-renderer";
import { GOLDEN_SCENARIOS } from "../../golden/scenarios";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

interface GoldenEntry {
  readonly scenarioId: string;
  readonly profileId: string;
  readonly output: string;
}

const matrix = JSON.parse(readFileSync("tests/golden/fixtures/v500.6.11/matrix.json", "utf8")) as {
  readonly entries: readonly GoldenEntry[];
};

describe("Standard JSON profile", () => {
  it.each(GOLDEN_SCENARIOS)("renders the authoritative envelope byte-identically: $id", async (scenario) => {
    expect(await renderScenario(scenario, "Standard JSON", createStandardJsonLayout))
      .toBe(goldenOutput(scenario.id, "standardJson"));
  });
});

describe("Safe JSON profile", () => {
  it.each(GOLDEN_SCENARIOS)("renders the authoritative envelope byte-identically: $id", async (scenario) => {
    expect(await renderScenario(scenario, "Safe JSON", createSafeJsonLayout))
      .toBe(goldenOutput(scenario.id, "safeJson"));
  });
});

async function renderScenario(
  scenario: (typeof GOLDEN_SCENARIOS)[number],
  sourceProfile: string,
  layoutFactory: (mode: JsonPromptProjectionMode) => JsonProfileLayout,
): Promise<string> {
  const promptLanguage = scenario.language === "Deutsch" ? "Deutsch" : "English";
  const state = await new ConstraintEngine({
    runtime: createFixedRuntime().runtime,
    stateBuilder: createResolvedStateBuilder(),
  }).resolve(
    { ...createCanonicalProjectStateV5Values(), ...scenario.input, promptLanguage, profile: sourceProfile, step: 9 },
    [
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
    ],
  );
  const document = new PromptAstBuilder().build(state, [
    additionalPersonSection,
    adaptiveRealismSection,
    cameraSection,
    characterSheetSection,
    garmentSection,
    materialPhysicsSection,
    modelBehaviourSection,
    sceneLightingSection,
    selfieSection,
  ]);
  const projection = new JsonPromptProjectionBuilder().build(document, state);
  return new JsonRenderer().render(projection, layoutFactory(projection.mode)).serialized;
}

function goldenOutput(scenarioId: string, profileId: string): string {
  const entry = matrix.entries.find((candidate) => candidate.scenarioId === scenarioId && candidate.profileId === profileId);
  if (entry === undefined) throw new Error(`Missing Golden entry: ${scenarioId}/${profileId}`);
  return entry.output;
}
