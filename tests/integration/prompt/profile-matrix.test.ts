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
import { createUniversalLayout } from "../../../src/profiles/universal";
import { createGeminiNaturalLayout } from "../../../src/profiles/gemini-natural";
import { createGeminiProLayout } from "../../../src/profiles/gemini-pro";
import { createNanoBananaProLayout } from "../../../src/profiles/nano-banana-pro";
import { TextRenderer } from "../../../src/renderers/text-renderer";
import { createFixedRuntime } from "../../helpers/fixed-runtime";
import { GOLDEN_SCENARIOS } from "../../golden/scenarios";

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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "universal")!.output;

    expect(new TextRenderer().render(document, createUniversalLayout(document, promptLanguage)).value).toBe(expected);
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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "geminiNatural")!.output;

    expect(new TextRenderer().render(document, createGeminiNaturalLayout(document, promptLanguage)).value).toBe(expected);
  });

  it.each([
    ["Deutsch", "baseline.de"],
    ["English", "baseline.en"],
  ])("renders the complete Gemini Pro baseline byte-identically for %s", async (promptLanguage, scenarioId) => {
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage, profile: "Gemini Pro", step: 9 },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "geminiPro")!.output;

    expect(new TextRenderer().render(document, createGeminiProLayout(document, promptLanguage)).value).toBe(expected);
  });

  it.each([
    ["Deutsch", "baseline.de"],
    ["English", "baseline.en"],
  ])("renders the complete Nano Banana Pro baseline byte-identically in %s", async (promptLanguage, scenarioId) => {
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage, profile: "Nano Banana Pro", step: 9 },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "nanoBananaPro")!.output;

    expect(new TextRenderer().render(document, createNanoBananaProLayout(document, promptLanguage)).value).toBe(expected);
  });

  it.each([
    ["Deutsch", "Pose und Ausdruck: frontal und aufrecht stehend, Gewicht locker auf einem Bein. Sie blickt leicht links an der Kamera vorbei und zeigt einen entspannten Ausdruck."],
    ["English", "Pose and expression: Standing upright with weight resting naturally on one leg. She looks slightly past the camera and has a relaxed expression."],
  ])("frames the complete pose.action fragment with the exact Nano Banana Pro prefix in %s", async (promptLanguage, expectedLine) => {
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage, profile: "Nano Banana Pro", step: 9 },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const rendered = new TextRenderer().render(document, createNanoBananaProLayout(document, promptLanguage)).value;

    expect(rendered).toContain(`\n${expectedLine}`);
  });

  it.each([
    ["Deutsch", "Frisur: offen getragene"],
    ["English", "Hairstyle: loose"],
  ])("frames character.hairstyle with the exact Nano Banana Pro prefix in %s", async (promptLanguage, expectedLine) => {
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage, profile: "Nano Banana Pro", step: 9 },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const rendered = new TextRenderer().render(document, createNanoBananaProLayout(document, promptLanguage)).value;

    expect(rendered).toContain(`\n${expectedLine}`);
  });

  it.each([
    ["compact", "character-sheet.compact.en", "referenceSheet.compact"],
    ["standard", "character-sheet.en", "referenceSheet.standard"],
  ])("renders the %s English character reference sheet byte-identically for Gemini Natural", async (_variant, scenarioId, sheetType) => {
    const promptLanguage = "English";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      {
        ...createCanonicalProjectStateV5Values(),
        promptLanguage,
        profile: "Gemini Natural",
        step: 9,
        referenceMode: {
          enabled: true,
          mode: "referenceMode.character_sheet",
          sheetType,
          layout: "referenceLayout.grid",
        },
      },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "geminiNatural")!.output;

    expect(new TextRenderer().render(document, createGeminiNaturalLayout(document, promptLanguage)).value).toBe(expected);
  });

  it.each([
    ["Deutsch", "single-reference.de"],
    ["English", "single-reference.en"],
  ])("renders the single-reference scenario byte-identically for Gemini Natural in %s", async (promptLanguage, scenarioId) => {
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      {
        ...createCanonicalProjectStateV5Values(),
        promptLanguage,
        profile: "Gemini Natural",
        step: 9,
        referenceMode: {
          enabled: true,
          mode: "referenceMode.single_reference",
          purpose: "referencePurpose.identity",
          singleView: "referenceView.front",
        },
      },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "geminiNatural")!.output;

    expect(new TextRenderer().render(document, createGeminiNaturalLayout(document, promptLanguage)).value).toBe(expected);
  });

  it.each([
    ["enabled front-camera", "selfie.front-enabled.en", true, "selfie.front"],
    ["explicitly disabled", "selfie.disabled.en", false, "selfie.none"],
  ])("renders the %s selfie scenario byte-identically for Gemini Natural", async (_variant, scenarioId, enabled, type) => {
    const promptLanguage = "English";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      {
        ...createCanonicalProjectStateV5Values(),
        promptLanguage,
        profile: "Gemini Natural",
        step: 9,
        selfieMode: { enabled, type, phoneVisibility: "selfiePhone.auto" },
      },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "geminiNatural")!.output;

    expect(new TextRenderer().render(document, createGeminiNaturalLayout(document, promptLanguage)).value).toBe(expected);
  });

  it("renders the positive additional-person scenario byte-identically for Gemini Natural", async () => {
    const promptLanguage = "English";
    const scenarioId = "additional-person.en";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      {
        ...createCanonicalProjectStateV5Values(),
        promptLanguage,
        profile: "Gemini Natural",
        step: 9,
        additionalPerson: {
          enabled: true,
          type: "additionalPerson.randomWoman",
          position: "additionalPersonPosition.beside",
          activity: "additionalPersonActivity.standing",
        },
      },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "geminiNatural")!.output;

    expect(new TextRenderer().render(document, createGeminiNaturalLayout(document, promptLanguage)).value).toBe(expected);
  });

  it("renders the open-garment scenario byte-identically for Gemini Natural", async () => {
    const promptLanguage = "English";
    const scenarioId = "garment.open.en";
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === scenarioId)!;
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      {
        ...createCanonicalProjectStateV5Values(),
        ...scenario.input,
        promptLanguage,
        profile: "Gemini Natural",
        step: 9,
      },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "geminiNatural")!.output;

    expect(new TextRenderer().render(document, createGeminiNaturalLayout(document, promptLanguage)).value).toBe(expected);
  });

  it.each([
    ["universal", "Universal", "material-physics.en"],
    ["geminiNatural", "Gemini Natural", "material-physics.en"],
    ["geminiPro", "Gemini Pro", "material-physics.en"],
    ["universal", "Universal", "adaptive-realism.de"],
    ["geminiNatural", "Gemini Natural", "adaptive-realism.de"],
    ["geminiPro", "Gemini Pro", "adaptive-realism.de"],
    ["universal", "Universal", "adaptive-realism.en"],
    ["geminiNatural", "Gemini Natural", "adaptive-realism.en"],
    ["geminiPro", "Gemini Pro", "adaptive-realism.en"],
  ])("renders Batch-2 focal parity for %s / %s", async (profileId, profile, scenarioId) => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === scenarioId)!;
    const promptLanguage = scenario.language === "Deutsch" ? "Deutsch" : "English";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), ...scenario.input, promptLanguage, profile, step: 9 },
      [
        additionalPersonProvider,
        adaptiveRealismProvider,
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
    const layout = profileId === "universal"
      ? createUniversalLayout(document, promptLanguage)
      : profileId === "geminiNatural"
        ? createGeminiNaturalLayout(document, promptLanguage)
        : createGeminiProLayout(document, promptLanguage);
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === profileId)!.output;

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
  });

  it.each([
    ["universal", "Universal", "camera.full-body-85mm.de"],
    ["geminiNatural", "Gemini Natural", "camera.full-body-85mm.de"],
    ["geminiPro", "Gemini Pro", "camera.full-body-85mm.de"],
    ["universal", "Universal", "branding.named.de"],
    ["universal", "Universal", "branding.named.en"],
    ["geminiNatural", "Gemini Natural", "branding.named.de"],
    ["geminiNatural", "Gemini Natural", "branding.named.en"],
    ["geminiPro", "Gemini Pro", "branding.named.de"],
    ["geminiPro", "Gemini Pro", "branding.named.en"],
    ["universal", "Universal", "json.baseline.de"],
    ["geminiNatural", "Gemini Natural", "json.baseline.de"],
    ["geminiPro", "Gemini Pro", "json.baseline.de"],
  ])("renders Batch-3 focal parity for %s / %s", async (profileId, profile, scenarioId) => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === scenarioId)!;
    const promptLanguage = scenario.language === "Deutsch" ? "Deutsch" : "English";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), ...scenario.input, promptLanguage, profile, step: 9 },
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
    const layout = profileId === "universal"
      ? createUniversalLayout(document, promptLanguage)
      : profileId === "geminiNatural"
        ? createGeminiNaturalLayout(document, promptLanguage)
        : createGeminiProLayout(document, promptLanguage);
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === profileId)!.output;

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
  });

  it.each([
    ["universal", "Universal", "quality-gate.release.de"],
    ["universal", "Universal", "json.v5611-special.en"],
    ["geminiNatural", "Gemini Natural", "quality-gate.release.de"],
    ["geminiPro", "Gemini Pro", "quality-gate.release.de"],
    ["nanoBananaPro", "Nano Banana Pro", "quality-gate.release.de"],
    ["nanoBananaPro", "Nano Banana Pro", "json.v5611-special.en"],
  ])("renders the complete RC-08 execution contract for %s / %s", async (profileId, profile, scenarioId) => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === scenarioId)!;
    const promptLanguage = scenario.language === "Deutsch" ? "Deutsch" : "English";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), ...scenario.input, promptLanguage, profile, step: 9 },
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
    const layout = profileId === "universal"
      ? createUniversalLayout(document, promptLanguage)
      : profileId === "geminiNatural"
        ? createGeminiNaturalLayout(document, promptLanguage)
        : profileId === "geminiPro"
          ? createGeminiProLayout(document, promptLanguage)
          : createNanoBananaProLayout(document, promptLanguage);
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === profileId)!.output;
    const nano = profileId === "nanoBananaPro";
    const expectedExecution = nano
      ? expected.split("\n\n")[0]!
      : `${expected.split("\n\n===== IMAGE PROMPT =====")[0]}\n\n===== IMAGE PROMPT =====`;
    const executionLayout = { ...layout, textBlocks: layout.textBlocks?.slice(0, nano ? 1 : 2) };

    expect(state.values).toHaveProperty("model.execution", "execution.generate_single_image");
    expect(state.trace.entries.find(({ path }) => path === "model.execution")).toMatchObject({ sourceField: "executionInstruction" });
    expect(new TextRenderer().render(document, executionLayout).value).toBe(expectedExecution);
  });

  it.each([
    ["universal", "Universal", "character-sheet.compact.en"],
    ["universal", "Universal", "character-sheet.en"],
    ["geminiPro", "Gemini Pro", "character-sheet.compact.en"],
    ["geminiPro", "Gemini Pro", "character-sheet.en"],
    ["universal", "Universal", "single-reference.de"],
    ["universal", "Universal", "single-reference.en"],
    ["geminiPro", "Gemini Pro", "single-reference.de"],
    ["geminiPro", "Gemini Pro", "single-reference.en"],
    ["nanoBananaPro", "Nano Banana Pro", "character-sheet.compact.en"],
    ["nanoBananaPro", "Nano Banana Pro", "character-sheet.en"],
  ])("renders Batch-5 reference parity for %s / %s", async (profileId, profile, scenarioId) => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === scenarioId)!;
    const promptLanguage = scenario.language === "Deutsch" ? "Deutsch" : "English";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), ...scenario.input, promptLanguage, profile, step: 9 },
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
    const layout = profileId === "universal"
      ? createUniversalLayout(document, promptLanguage)
      : profileId === "geminiPro"
        ? createGeminiProLayout(document, promptLanguage)
        : createNanoBananaProLayout(document, promptLanguage);
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === profileId)!.output;

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
  });

  it.each([
    ["universal", "Universal", "selfie.front-enabled.en"],
    ["geminiPro", "Gemini Pro", "selfie.front-enabled.en"],
    ["universal", "Universal", "garment.open.en"],
    ["universal", "Universal", "material-physics.de"],
    ["geminiNatural", "Gemini Natural", "material-physics.de"],
    ["geminiPro", "Gemini Pro", "garment.open.en"],
    ["geminiPro", "Gemini Pro", "material-physics.de"],
  ])("renders Batch-6 selfie and garment-state parity for %s / %s", async (profileId, profile, scenarioId) => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === scenarioId)!;
    const promptLanguage = scenario.language === "Deutsch" ? "Deutsch" : "English";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), ...scenario.input, promptLanguage, profile, step: 9 },
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
    const layout = profileId === "universal"
      ? createUniversalLayout(document, promptLanguage)
      : profileId === "geminiNatural"
        ? createGeminiNaturalLayout(document, promptLanguage)
        : createGeminiProLayout(document, promptLanguage);
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === profileId)!.output;

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
  });

  it.each([
    ["geminiNatural", "Gemini Natural", "json.v5611-special.en"],
    ["geminiPro", "Gemini Pro", "json.v5611-special.en"],
    ["geminiPro", "Gemini Pro", "additional-person.en"],
  ])("renders Batch-7 multi-person semantics for %s / %s", async (profileId, profile, scenarioId) => {
    const scenario = GOLDEN_SCENARIOS.find(({ id }) => id === scenarioId)!;
    const promptLanguage = scenario.language === "Deutsch" ? "Deutsch" : "English";
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      { ...createCanonicalProjectStateV5Values(), ...scenario.input, promptLanguage, profile, step: 9 },
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
    const layout = profileId === "geminiNatural"
      ? createGeminiNaturalLayout(document, promptLanguage)
      : createGeminiProLayout(document, promptLanguage);
    const expected = matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === profileId)!.output;

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
  });
});
