import { describe, expect, it } from "vitest";

import type { ConstraintProvider } from "../../../src/domain/contracts/constraints/provider";
import { additionalPersonProvider } from "../../../src/plugins/additional-person/rules";
import { adaptiveRealismProvider } from "../../../src/plugins/adaptive-realism/rules";
import { brandProvider } from "../../../src/plugins/brand/rules";
import { cameraProvider } from "../../../src/plugins/camera/rules";
import { characterSheetProvider } from "../../../src/plugins/character-sheet/rules";
import { garmentProvider } from "../../../src/plugins/garment/rules";
import { materialPhysicsProvider } from "../../../src/plugins/material-physics/rules";
import { modelBehaviourProvider } from "../../../src/plugins/model-behaviour/rules";
import { safetyProvider } from "../../../src/plugins/safety/rules";
import { selfieProvider } from "../../../src/plugins/selfie/rules";
import { ConstraintEngine } from "../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

const providers: readonly ConstraintProvider[] = [
  characterSheetProvider,
  adaptiveRealismProvider,
  materialPhysicsProvider,
  cameraProvider,
  selfieProvider,
  additionalPersonProvider,
  brandProvider,
  garmentProvider,
  safetyProvider,
  modelBehaviourProvider,
];

describe("V500.6.11 rule parity", () => {
  it.each([
    {
      id: "selfie binding", input: { camera: { selfie: true, device: "mirrorless" } }, expectedValues: { camera: { device: "smartphone", selfie: true, framing: "arm-length selfie" } }, trace: [{ path: "camera.device", ruleId: "selfie.camera-binding", sourceField: "camera.selfie" }],
    },
    {
      id: "additional person", input: { scene: { additionalPerson: true } }, expectedValues: { scene: { additionalPerson: true } }, trace: [{ path: "scene.additionalPerson", ruleId: "additional-person.presence", sourceField: "scene.additionalPerson" }],
    },
    {
      id: "open garment state", input: { garment: { outer: "open cardigan", upperLayer: "tank top" } }, expectedValues: { garment: { outer: "open cardigan", upperLayer: "tank top", open: true } }, trace: [{ path: "garment.open", ruleId: "garment.open-state", sourceField: "garment.outer" }],
    },
    {
      id: "upper-layer contract", input: { garment: { outer: "open cardigan" } }, blocked: "Open garment requires an upper layer",
    },
    {
      id: "material physics", input: { garment: { material: "Denim" } }, expectedValues: { material: { fabric: "Denim", physics: "structured natural folds" } }, trace: [{ path: "material.physics", ruleId: "material-physics.denim-physics", sourceField: "garment.material" }],
    },
    {
      id: "adaptive realism reference", input: { realism: { reference: "documentary" } }, expectedValues: { realism: { reference: "documentary" } }, trace: [{ path: "realism.reference", ruleId: "adaptive-realism.reference", sourceField: "realism.reference" }],
    },
    {
      id: "camera", input: { camera: { device: "mirrorless" } }, expectedValues: { camera: { device: "mirrorless" } }, trace: [{ path: "camera.device", ruleId: "camera.device", sourceField: "camera.device" }],
    },
    {
      id: "light", input: { lighting: { weather: "Bewölkt", source: "Direkte Sonne" } }, expectedValues: { lighting: { source: "Bewölkter Himmel" } }, trace: [{ path: "lighting.source", ruleId: "camera.overcast-light-binding", sourceField: "lighting.weather" }],
    },
    {
      id: "branding", input: { garment: { brand: "Northstar" } }, expectedValues: { brand: { name: "Northstar", allowedGarment: "outer" } }, trace: [{ path: "brand.allowedGarment", ruleId: "brand.garment-binding", sourceField: "garment.brand" }],
    },
    {
      id: "safety", input: { character: { age: 29 } }, expectedValues: { safety: { adult: true } }, trace: [{ path: "safety.adult", ruleId: "safety.adult-subject", sourceField: "character.age" }],
    },
    {
      id: "character sheet", input: { character: { age: 29, name: "Ada" } }, expectedValues: { character: { age: 29, adult: true, name: "Ada" } }, trace: [{ path: "character.adult", ruleId: "character-sheet.adult-status", sourceField: "character.age" }],
    },
    {
      id: "quality gate", input: { quality: { passed: false } }, blocked: "Quality gate blocked",
    },
    {
      id: "model behaviour", input: { model: { behaviour: "strict-json" } }, expectedValues: { model: { behaviour: "strict-json" } }, trace: [{ path: "model.behaviour", ruleId: "model-behaviour.selection", sourceField: "model.behaviour" }],
    },
  ])("matches the V500.6.11 $id case", async ({ input, expectedValues, trace, blocked }) => {
    const engine = new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() });
    if (blocked !== undefined) {
      await expect(engine.resolve(input, providers)).rejects.toThrow(blocked);
      return;
    }

    const first = await engine.resolve(input, providers);
    const second = await engine.resolve(input, [...providers].reverse());

    expect(first).toEqual(second);
    expect(first.values).toMatchObject(expectedValues ?? {});
    for (const expected of trace ?? []) {
      expect(first.trace.entries).toContainEqual(expect.objectContaining(expected));
    }
  });
});
