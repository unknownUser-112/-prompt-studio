import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import type { ProfileLayout } from "../../src/domain/contracts/prompt/layout";
import { ConstraintEngine } from "../../src/domain/engines/constraint-engine";
import { PromptAstBuilder } from "../../src/domain/engines/prompt-ast-builder";
import { createResolvedStateBuilder } from "../../src/domain/engines/resolved-state-builder";
import { createCanonicalProjectStateV4Values } from "../../src/domain/entities/project-factory";
import { cameraProvider } from "../../src/plugins/camera/rules";
import { cameraSection } from "../../src/plugins/camera/sections";
import { characterSheetProvider } from "../../src/plugins/character-sheet/rules";
import { characterSheetSection } from "../../src/plugins/character-sheet/sections";
import { materialPhysicsProvider } from "../../src/plugins/material-physics/rules";
import { materialPhysicsSection } from "../../src/plugins/material-physics/sections";
import { garmentProvider } from "../../src/plugins/garment/rules";
import { garmentSection } from "../../src/plugins/garment/sections";
import { adaptiveRealismProvider } from "../../src/plugins/adaptive-realism/rules";
import { adaptiveRealismSection } from "../../src/plugins/adaptive-realism/sections";
import { modelBehaviourProvider } from "../../src/plugins/model-behaviour/rules";
import { modelBehaviourSection } from "../../src/plugins/model-behaviour/sections";
import { TextRenderer } from "../../src/renderers/text-renderer";
import { createFixedRuntime } from "../helpers/fixed-runtime";

const BASELINE_DE_CAMERA = "KAMERA / PERSPEKTIVE\nGanzkörper, Kopf bis Fuß, beide Füße sichtbar. Eine einzige durchgehende Ganzkörperaufnahme; keine zusätzlichen Nahaufnahmen, Ausschnitte oder Wiederholungen derselben Person. Priorisiere vollständige Körperhaltung, beide Füße, Outfit und räumlichen Kontext. Haut- und Haardetails bleiben natürlich sichtbar, aber nicht als Nahaufnahme inszeniert. Aufgenommen mit einer modernes Smartphone-Kamerasystem und einem hauptkamera des Smartphones mit natürlicher Perspektive. natürlicher, authentischer fotografischer Charakter. natürliche Farbwiedergabe und ausgewogener Kontrast.";
const BASELINE_EN_CAMERA = "CAMERA / PERSPECTIVE\nfull-body frame from head to toe with both feet visible. Use one continuous full-body frame only; do not add a portrait crop, close-up, alternate framing, or repeated view of the subject. Prioritize the complete pose, both feet, outfit, and environmental context. Skin and hair texture should remain naturally plausible at full-body viewing distance, not enlarged as a close-up. Captured with a modern smartphone camera system using a smartphone main camera with a natural perspective. The camera is at eye level. The shooting distance feels natural. Depth of field is subtle, and the shot feels calm and handheld. The framing should resemble a naturally captured smartphone photo rather than a carefully staged fashion campaign.";

interface GoldenEntry { readonly scenarioId: string; readonly profileId: string; readonly output: string }
const matrix = JSON.parse(readFileSync("tests/golden/fixtures/v500.6.11/matrix.json", "utf8")) as { readonly entries: readonly GoldenEntry[] };
const goldenBlocks = (scenarioId: string) => matrix.entries.find((entry) => entry.scenarioId === scenarioId && entry.profileId === "universal")!.output.split("\n\n");

describe("V600 prompt parity", () => {
  it("renders the traced German camera section for universal/baseline.de", async () => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage: "Deutsch", profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [cameraProvider]);
    const document = new PromptAstBuilder().build(state, [cameraSection]);
    const layout: ProfileLayout = { id: "universal", sections: [{ sectionId: document.sections[0]!.id, order: 0 }] };

    const result = new TextRenderer().render(document, layout);

    expect(result.value).toBe(BASELINE_DE_CAMERA);
    expect(result.trace.map(({ path }) => path)).toEqual([
      "camera.device",
      "camera.framing",
      "camera.lens",
      "camera.perspective",
      "camera.photoLook",
      "camera.style",
    ]);
  });

  it("renders the traced English camera section for universal/baseline.en", async () => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage: "English", profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [cameraProvider]);
    const document = new PromptAstBuilder().build(state, [cameraSection]);
    const layout: ProfileLayout = { id: "universal", sections: [{ sectionId: document.sections[0]!.id, order: 0 }] };

    const result = new TextRenderer().render(document, layout);

    expect(result.value).toBe(BASELINE_EN_CAMERA);
    expect(result.trace).toHaveLength(6);
  });

  it("renders the traced German subject and human-detail blocks for universal/baseline.de", async () => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage: "Deutsch", profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [characterSheetProvider]);
    const document = new PromptAstBuilder().build(state, [characterSheetSection]);
    const layout: ProfileLayout = {
      id: "universal",
      sections: document.sections
        .filter((section) => !section.id.includes("character-sheet-c-pose") && !section.id.includes("character-sheet-d-face"))
        .map((section, order) => ({ sectionId: section.id, order })),
    };

    const result = new TextRenderer().render(document, layout);

    expect(result.value).toBe(goldenBlocks("baseline.de").slice(1, 3).join("\n\n"));
    expect(new Set(result.trace.map(({ path }) => path))).toEqual(new Set([
      "character.age",
      "character.adult",
      "character.bodyBuild",
      "character.chestShape",
      "character.chestVolume",
      "character.eyeColor",
      "character.eyeShape",
      "character.faceAge",
      "character.faceShape",
      "character.gender",
      "character.hair.color",
      "character.hair.length",
      "character.hair.style",
      "character.hair.texture",
      "character.heightCentimeters",
      "character.lowerBody",
      "character.noseShape",
      "character.skinTone",
      "pose.expression",
      "pose.gaze",
      "pose.position",
    ]));
  });

  it("renders the traced English subject and human-detail blocks for universal/baseline.en", async () => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage: "English", profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [characterSheetProvider]);
    const document = new PromptAstBuilder().build(state, [characterSheetSection]);
    const layout: ProfileLayout = {
      id: "universal",
      sections: document.sections
        .filter((section) => !section.id.includes("character-sheet-c-pose") && !section.id.includes("character-sheet-d-face"))
        .map((section, order) => ({ sectionId: section.id, order })),
    };

    expect(new TextRenderer().render(document, layout).value).toBe(goldenBlocks("baseline.en").slice(1, 3).join("\n\n"));
  });

  it.each([
    ["Deutsch", "baseline.de", "ADAPTIVE MATERIALPHYSIK"],
    ["English", "baseline.en", "ADAPTIVE MATERIAL PHYSICS"],
  ])("renders the traced material-physics block for %s", async (promptLanguage, scenarioId, heading) => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage, profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [materialPhysicsProvider]);
    const document = new PromptAstBuilder().build(state, [materialPhysicsSection]);
    const layout: ProfileLayout = { id: "universal", sections: [{ sectionId: document.sections[0]!.id, order: 0 }] };
    const expected = goldenBlocks(scenarioId).find((block) => block.startsWith(`${heading}\n`));

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
    expect(new Set(state.trace.entries
      .filter(({ path }) => ["material.footwear", "material.lower", "material.upper"].includes(path))
      .map(({ sourceField }) => sourceField))).toEqual(new Set([
      "garment.upper.material",
      "garment.lower.material",
      "garment.footwear.material",
    ]));
  });

  it.each([
    ["Deutsch", "baseline.de", "ADAPTIVER PHYSIKKONTEXT"],
    ["English", "baseline.en", "ADAPTIVE PHYSICAL CONTEXT"],
  ])("renders the traced adaptive physical context for %s", async (promptLanguage, scenarioId, heading) => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage, profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [materialPhysicsProvider]);
    const document = new PromptAstBuilder().build(state, [materialPhysicsSection]);
    const context = document.sections.find((section) => section.id.includes("material-physics-b-context"))!;
    const layout: ProfileLayout = { id: "universal", sections: [{ sectionId: context.id, order: 0 }] };
    const expected = goldenBlocks(scenarioId).find((block) => block.startsWith(`${heading}\n`));
    const contextTrace = state.trace.entries.find(({ path }) => path === "material.adaptivePhysicalContext");

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
    expect(contextTrace).toHaveProperty("sourceFields");
  });

  it.each([
    ["Deutsch", "baseline.de"],
    ["English", "baseline.en"],
  ])("renders traced outfit and pose blocks for %s", async (promptLanguage, scenarioId) => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage, profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [characterSheetProvider, garmentProvider]);
    const document = new PromptAstBuilder().build(state, [characterSheetSection, garmentSection]);
    const outfit = document.sections.find((section) => section.sourcePluginId === "garment")!;
    const pose = document.sections.find((section) => section.id.includes("character-sheet-c-pose"))!;
    const layout: ProfileLayout = {
      id: "universal",
      sections: [outfit, pose].map((section, order) => ({ sectionId: section.id, order })),
    };

    expect(new TextRenderer().render(document, layout).value).toBe(goldenBlocks(scenarioId).slice(3, 5).join("\n\n"));
  });

  it.each([
    ["Deutsch", "baseline.de", "STIL", "ADAPTIVER REALISMUS"],
    ["English", "baseline.en", "STYLE", "ADAPTIVE REALISM"],
  ])("renders traced style and adaptive-realism blocks for %s", async (promptLanguage, scenarioId, styleHeading, realismHeading) => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage, profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [adaptiveRealismProvider, modelBehaviourProvider]);
    const document = new PromptAstBuilder().build(state, [adaptiveRealismSection, modelBehaviourSection]);
    const style = document.sections.find((section) => section.sourcePluginId === "model-behaviour")!;
    const realism = document.sections.find((section) => section.sourcePluginId === "adaptive-realism")!;
    const layout: ProfileLayout = {
      id: "universal",
      sections: [style, realism].map((section, order) => ({ sectionId: section.id, order })),
    };
    const expectedBlocks = goldenBlocks(scenarioId);
    const expected = [styleHeading, realismHeading]
      .map((heading) => expectedBlocks.find((block) => block.startsWith(`${heading}\n`)))
      .join("\n\n");

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
    expect(state.trace.entries.map(({ path }) => path)).toEqual(["captureAppearance", "model.behaviour", "realism.reference"]);
  });

  it("renders the traced English skin-and-capture-appearance block", async () => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage: "English", profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [adaptiveRealismProvider]);
    const document = new PromptAstBuilder().build(state, [adaptiveRealismSection]);
    const capture = document.sections.find((section) => section.id.includes("adaptive-realism-b-capture"))!;
    const layout: ProfileLayout = { id: "universal", sections: [{ sectionId: capture.id, order: 0 }] };
    const expected = goldenBlocks("baseline.en").find((block) => block.startsWith("SKIN AND CAPTURE APPEARANCE\n"));
    const trace = state.trace.entries.find(({ path }) => path === "captureAppearance");

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
    expect(trace).toMatchObject({
      sourceFields: ["camera.photoLook", "camera.style", "character.skinTone", "realism.reference"],
    });
  });

  it.each([
    ["Deutsch", "baseline.de", "GESICHTSMERKMALE"],
    ["English", "baseline.en", "FACIAL FEATURES"],
  ])("renders the traced facial-features block for %s", async (promptLanguage, scenarioId, heading) => {
    const runtime = createFixedRuntime().runtime;
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });
    const input = { ...createCanonicalProjectStateV4Values(), promptLanguage, profile: "Universal", step: 9 };
    const state = await engine.resolve(input, [characterSheetProvider]);
    const document = new PromptAstBuilder().build(state, [characterSheetSection]);
    const facialFeatures = document.sections.find((section) => section.id.includes("character-sheet-d-face"))!;
    const layout: ProfileLayout = { id: "universal", sections: [{ sectionId: facialFeatures.id, order: 0 }] };
    const expected = goldenBlocks(scenarioId).find((block) => block.startsWith(`${heading}\n`));

    expect(new TextRenderer().render(document, layout).value).toBe(expected);
    expect(new Set(state.trace.entries.filter(({ path }) => path.startsWith("character.face")).map(({ path }) => path))).toEqual(new Set([
      "character.faceAge",
      "character.faceShape",
    ]));
    expect(state.trace.entries.some(({ path }) => path === "character.eyeShape")).toBe(true);
    expect(state.trace.entries.some(({ path }) => path === "character.noseShape")).toBe(true);
  });
});
