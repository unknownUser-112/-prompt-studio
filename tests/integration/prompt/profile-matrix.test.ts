import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ConstraintEngine } from "../../../src/domain/engines/constraint-engine";
import { PromptAstBuilder } from "../../../src/domain/engines/prompt-ast-builder";
import { createResolvedStateBuilder } from "../../../src/domain/engines/resolved-state-builder";
import { createCanonicalProjectStateV5Values } from "../../../src/domain/entities/project-factory";
import { additionalPersonProvider } from "../../../src/plugins/additional-person/rules";
import { additionalPersonSection } from "../../../src/plugins/additional-person/sections";
import { adaptiveRealismProvider } from "../../../src/plugins/adaptive-realism/rules";
import { adaptiveRealismSection } from "../../../src/plugins/adaptive-realism/sections";
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
import { createUniversalLayout } from "../../../src/profiles/universal";
import { createGeminiNaturalLayout } from "../../../src/profiles/gemini-natural";
import { TextRenderer } from "../../../src/renderers/text-renderer";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

interface GoldenEntry { readonly scenarioId: string; readonly profileId: string; readonly output: string }
const matrix = JSON.parse(readFileSync("tests/golden/fixtures/v500.6.11/matrix.json", "utf8")) as { readonly entries: readonly GoldenEntry[] };

describe("V600 profile matrix", () => {
  it.each([
    ["Deutsch", "baseline.de"],
    ["English", "baseline.en"],
  ])("renders the complete universal baseline byte-identically for %s", async (promptLanguage, scenarioId) => {
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage, profile: "Universal", step: 9 },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
        cameraProvider,
        characterSheetProvider,
        garmentProvider,
        materialPhysicsProvider,
        modelBehaviourProvider,
        sceneLightingProvider,
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
    ]);
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "universal")!.output;

    expect(new TextRenderer().render(document, createUniversalLayout(document)).value).toBe(expected);
  });

  it.each([
    ["Deutsch", "baseline.de"],
    ["English", "baseline.en"],
  ])("renders the complete Gemini Natural baseline byte-identically for %s", async (promptLanguage, scenarioId) => {
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage, profile: "Gemini Natural", step: 9 },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
        cameraProvider,
        characterSheetProvider,
        garmentProvider,
        materialPhysicsProvider,
        modelBehaviourProvider,
        sceneLightingProvider,
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
    ]);
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "geminiNatural")!.output;

    expect(new TextRenderer().render(document, createGeminiNaturalLayout(document, promptLanguage)).value).toBe(expected);
  });
});
