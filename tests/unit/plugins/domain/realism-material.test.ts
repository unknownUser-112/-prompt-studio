import { describe, expect, it } from "vitest";

import { adaptiveRealismProvider } from "../../../../src/plugins/adaptive-realism/rules";
import { adaptiveRealismSection } from "../../../../src/plugins/adaptive-realism/sections";
import { materialPhysicsProvider } from "../../../../src/plugins/material-physics/rules";
import { materialPhysicsSection } from "../../../../src/plugins/material-physics/sections";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";
import { createCanonicalProjectStateV5Values } from "../../../../src/domain/entities/project-factory";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [materialPhysicsProvider, adaptiveRealismProvider]);
const resolveMaterials = (input: unknown, reversed = false) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
  input,
  reversed ? [adaptiveRealismProvider, materialPhysicsProvider] : [materialPhysicsProvider, adaptiveRealismProvider],
);
const resolveAdaptive = (input: unknown, reversed = false) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
  input,
  reversed ? [materialPhysicsProvider, adaptiveRealismProvider] : [adaptiveRealismProvider, materialPhysicsProvider],
);

describe("adaptive realism and material physics plugins", () => {
  it("preserves a requested realism reference and derives fabric physics", async () => {
    const state = await resolve({ realism: { reference: "documentary" }, garment: { material: "Denim" } });

    expect(state.values).toEqual({
      realism: { reference: "documentary" },
      material: { fabric: "Denim", physics: "structured natural folds" },
    });
    expect(new Set(state.trace.entries.map((entry) => entry.ruleId))).toEqual(new Set(["adaptive-realism.reference", "material-physics.material", "material-physics.denim-physics"]));
  });

  it("projects upper, lower, and footwear material facts with stable traces", async () => {
    const input = {
      garment: {
        upper: { material: "material.cotton" },
        lower: { material: "material.denim" },
        footwear: { material: "material.leather_textile" },
      },
    };

    const state = await resolveMaterials(input);

    expect(state.values).toMatchObject({
      material: {
        footwear: "material.leather_textile",
        lower: "material.denim",
        upper: "material.cotton",
      },
    });
    expect(state.trace.entries
      .filter(({ path }) => ["material.footwear", "material.lower", "material.upper"].includes(path))
      .map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      {
        id: "material.footwear:material-physics.footwear-material",
        path: "material.footwear",
        ruleId: "material-physics.footwear-material",
        sourceField: "garment.footwear.material",
      },
      {
        id: "material.lower:material-physics.lower-material",
        path: "material.lower",
        ruleId: "material-physics.lower-material",
        sourceField: "garment.lower.material",
      },
      {
        id: "material.upper:material-physics.upper-material",
        path: "material.upper",
        ruleId: "material-physics.upper-material",
        sourceField: "garment.upper.material",
      },
    ]);
  });

  it("does not invent missing materials and stays deterministic across provider order", async () => {
    const input = { garment: { upper: { material: "material.cotton" } } };

    const normal = await resolveMaterials(input);
    const reversed = await resolveMaterials(input, true);

    expect(normal.values).toEqual({ material: { upper: "material.cotton" } });
    expect(reversed).toEqual(normal);
  });

  it("derives one traceable adaptive physical context from the exact baseline inputs", async () => {
    const input = {
      camera: { device: "device.smartphone", lens: "lens.smart_main", photoLook: "photoLook.natural", style: "style.authentic_lifestyle" },
      character: { hair: { style: "hairStyle.loose", texture: "hairTexture.natural_waves" } },
      garment: {
        upper: { material: "material.cotton" },
        lower: { material: "material.denim" },
        footwear: { material: "material.leather_textile" },
      },
      lighting: { source: "lightSource.window", setup: "lighting.soft_side_window", whiteBalance: "whiteBalance.neutral" },
      pose: { position: "pose.standing" },
    };

    const state = await resolveMaterials(input);
    const trace = state.trace.entries.find(({ path }) => path === "material.adaptivePhysicalContext");

    expect(state.values.material).toMatchObject({
      adaptivePhysicalContext: {
        camera: input.camera,
        hair: input.character.hair,
        lighting: input.lighting,
        materials: {
          footwear: "material.leather_textile",
          lower: "material.denim",
          upper: "material.cotton",
        },
        pose: input.pose,
      },
    });
    expect(trace).toMatchObject({
      id: "material.adaptivePhysicalContext:material-physics.adaptive-physical-context",
      ruleId: "material-physics.adaptive-physical-context",
      sourceFields: [
        "camera.device",
        "camera.lens",
        "camera.photoLook",
        "camera.style",
        "character.hair.style",
        "character.hair.texture",
        "garment.footwear.material",
        "garment.lower.material",
        "garment.upper.material",
        "lighting.setup",
        "lighting.source",
        "lighting.whiteBalance",
        "pose.position",
      ],
    });
  });

  it("uses only present optional inputs and remains deterministic across provider order", async () => {
    const input = { camera: { device: "device.smartphone" }, pose: { position: "pose.standing" } };

    const normal = await resolveMaterials(input);
    const reversed = await resolveMaterials(input, true);

    expect(normal.values.material).toEqual({
      adaptivePhysicalContext: {
        camera: { device: "device.smartphone" },
        pose: { position: "pose.standing" },
      },
    });
    expect(normal.trace.entries[0]).toMatchObject({ sourceFields: ["camera.device", "pose.position"] });
    expect(reversed).toEqual(normal);
  });

  it("does not let the section provider derive a missing adaptive physical context", async () => {
    const stateWithoutMaterialRules = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() })
      .resolve({ camera: { device: "device.smartphone" }, pose: { position: "pose.standing" } }, [adaptiveRealismProvider]);

    expect(materialPhysicsSection.provide(stateWithoutMaterialRules).some(({ slotId }) => slotId === "material-physics-b-context")).toBe(false);
  });

  it("derives the baseline capture appearance from exact skin, camera, and realism facts", async () => {
    const input = {
      camera: { photoLook: "photoLook.natural", style: "style.authentic_lifestyle" },
      character: { skinTone: "skinTone.fair_warm" },
      realism: { reference: "realism.standard" },
    };

    const state = await resolveAdaptive(input);
    const trace = state.trace.entries.find(({ path }) => path === "captureAppearance");

    expect(state.values.captureAppearance).toEqual({
      photographicCharacter: "style.authentic_lifestyle",
      photoLook: "photoLook.natural",
      realismReference: "realism.standard",
      skinTone: "skinTone.fair_warm",
    });
    expect(trace).toMatchObject({
      id: "captureAppearance:adaptive-realism.capture-appearance",
      ruleId: "adaptive-realism.capture-appearance",
      sourceFields: ["camera.photoLook", "camera.style", "character.skinTone", "realism.reference"],
    });
  });

  it("uses only present capture inputs and stays deterministic across provider order", async () => {
    const input = { camera: { photoLook: "photoLook.natural" }, character: { skinTone: "skinTone.fair_warm" } };

    const normal = await resolveAdaptive(input);
    const reversed = await resolveAdaptive(input, true);

    expect(normal.values.captureAppearance).toEqual({
      photoLook: "photoLook.natural",
      skinTone: "skinTone.fair_warm",
    });
    expect(normal.trace.entries[0]).toMatchObject({ sourceFields: ["camera.photoLook", "character.skinTone"] });
    expect(reversed).toEqual(normal);
  });

  it("does not let the adaptive-realism section derive a missing capture appearance", async () => {
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() })
      .resolve({ realism: { reference: "realism.standard" } }, [adaptiveRealismProvider]);

    expect(adaptiveRealismSection.provide(state).some(({ slotId }) => slotId === "adaptive-realism-b-capture")).toBe(false);
  });

  it.each(["Deutsch", "English"])("exposes exact traced material and physical-context fragments in %s", async (promptLanguage) => {
    const state = await resolveMaterials({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = materialPhysicsSection.provide(state);
    const second = materialPhysicsSection.provide(state);
    const fragments = first.flatMap((draft) => draft.fragments ?? []);
    const material = fragments.find(({ id }) => id === "material.physics");
    const context = fragments.find(({ id }) => id === "material.adaptive-physical-context");
    const contextTrace = state.trace.entries.find(({ path }) => path === "material.adaptivePhysicalContext")!;

    expect(first).toEqual(second);
    expect(material?.text).not.toMatch(/^ADAPTIVE/u);
    expect(context?.text).not.toMatch(/^ADAPTIVE/u);
    expect(material?.traceIds).toHaveLength(3);
    expect(context?.traceIds).toEqual([contextTrace.id]);
    expect(contextTrace).toHaveProperty("sourceFields");
  });

  it("exposes adaptive-realism fragments with exact resolved traces", async () => {
    const state = await resolveAdaptive({ ...createCanonicalProjectStateV5Values(), promptLanguage: "English" });
    const fragments = adaptiveRealismSection.provide(state).flatMap((draft) => draft.fragments ?? []);

    expect(fragments.map(({ id }) => id)).toEqual(["realism.adaptive", "realism.capture-appearance"]);
    expect(fragments[0]?.traceIds).toEqual([state.trace.entries.find(({ path }) => path === "realism.reference")!.id]);
    expect(fragments[1]?.traceIds).toEqual([state.trace.entries.find(({ path }) => path === "captureAppearance")!.id]);
  });
});
