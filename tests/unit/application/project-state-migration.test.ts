import { describe, expect, it } from "vitest";

import { migrateProjectStateV1ToV2 } from "../../../src/application/migrations/v600-project-state-v1-to-v2";
import { migrateProjectStateV2ToV3 } from "../../../src/application/migrations/v600-project-state-v2-to-v3";
import {
  migrateProjectStateV3ToV4,
} from "../../../src/application/migrations/v600-project-state-v3-to-v4";
import {
  migrateProjectStateToCurrent,
  migrateProjectStateV4ToV5,
} from "../../../src/application/migrations/v600-project-state-v4-to-v5";
import {
  createCanonicalProjectStateV2Values,
  createCanonicalProjectStateV3Values,
  createCanonicalProjectStateV4Values,
  createCanonicalProjectStateV5Values,
  createNewProject,
} from "../../../src/domain/entities/project-factory";
import type { DomainObject } from "../../../src/domain/entities/project";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

describe("ProjectState v1 to v2 migration", () => {
  it("deeply adds only missing canonical baseline facts and preserves user values", () => {
    const v1: DomainObject = {
      schemaVersion: 1,
      wizardStep: 7,
      values: {
        camera: { device: "device.user_camera", exposureMode: "exposure.manual" },
        garment: {
          upper: { kind: "upperGarment.user", color: "color.user", material: "material.user" },
        },
        scene: { location: "location.user" },
        custom: { nested: ["kept", 7] },
      },
      assetIds: ["asset-user"],
    };

    const migrated = migrateProjectStateV1ToV2(v1);

    expect(migrated).toEqual({
      schemaVersion: 2,
      wizardStep: 7,
      values: {
        camera: {
          device: "device.user_camera",
          exposureMode: "exposure.manual",
          framing: "framing.whole_person",
          lens: "lens.smart_main",
          perspective: "cameraPerspective.natural",
          style: "style.authentic_lifestyle",
          photoLook: "photoLook.natural",
        },
        character: {
          gender: "gender.woman",
          age: 21,
          heightCentimeters: 160,
          bodyBuild: "bodyBuild.slim_balanced",
          chestVolume: "chestVolume.average",
          chestShape: "chestShape.natural_balanced",
          lowerBody: "lowerBody.balanced",
          skinTone: "skinTone.fair_warm",
          eyeColor: "eyeColor.gray_blue",
          hair: {
            color: "hairColor.blonde",
            length: "hairLength.chest",
            texture: "hairTexture.natural_waves",
            style: "hairStyle.loose",
          },
        },
        pose: {
          position: "pose.standing",
          gaze: "gaze.left_camera",
          expression: "expression.relaxed",
        },
        garment: {
          upper: { kind: "upperGarment.user", color: "color.user", material: "material.user" },
          lower: { kind: "lowerGarment.high_waist_jeans", color: "color.denim_blue", material: "material.denim" },
          footwear: { kind: "footwear.classic_sneakers", color: "color.white", material: "material.leather_textile" },
          outfitBuild: "outfitBuild.single_clean_layer",
        },
        scene: {
          location: "location.user",
          area: "locationArea.apartment.modern_living_room_window",
          mood: "mood.calm_authentic",
          atmosphere: "atmosphere.subtle_lived_in",
          surfaceCondition: "surfaceCondition.dry",
        },
        lighting: {
          source: "lightSource.window",
          setup: "lighting.soft_side_window",
          whiteBalance: "whiteBalance.neutral",
        },
        custom: { nested: ["kept", 7] },
      },
      assetIds: ["asset-user"],
    });
  });

  it("is deterministic and idempotent", () => {
    const input: DomainObject = { schemaVersion: 1, values: { subject: { age: 42 } } };

    const first = migrateProjectStateV1ToV2(input);
    const second = migrateProjectStateV1ToV2(input);
    const repeated = migrateProjectStateV1ToV2(first);

    expect(second).toEqual(first);
    expect(repeated).toEqual(first);
    expect(JSON.stringify(repeated)).toBe(JSON.stringify(first));
  });

  it("returns an existing V2 state unchanged", () => {
    const v2: DomainObject = {
      schemaVersion: 2,
      values: { ...createCanonicalProjectStateV2Values(), custom: "kept" },
    };

    expect(migrateProjectStateV1ToV2(v2)).toBe(v2);
  });

  it("adds only missing editable style facts when migrating V2 to V3", () => {
    const v2: DomainObject = {
      schemaVersion: 2,
      wizardStep: 6,
      values: {
        model: { behaviour: "modelBehaviour.user" },
        custom: { untouched: true },
      },
      assetIds: ["asset-user"],
    };

    expect(migrateProjectStateV2ToV3(v2)).toEqual({
      schemaVersion: 3,
      wizardStep: 6,
      values: {
        model: { behaviour: "modelBehaviour.user" },
        realism: { reference: "realism.reference" },
        custom: { untouched: true },
      },
      assetIds: ["asset-user"],
    });
  });

  it("keeps the V1 through V3 chain deterministic before the V4 step", () => {
    const v1: DomainObject = { schemaVersion: 1, values: { realism: { reference: "realism.user" } } };
    const v2 = migrateProjectStateV1ToV2(v1);
    const first = migrateProjectStateV2ToV3(v2);
    const second = migrateProjectStateV2ToV3(v2);

    expect(first).toMatchObject({
      schemaVersion: 3,
      values: {
        camera: { framing: "framing.whole_person" },
        model: { behaviour: "modelBehaviour.authentic_lifestyle" },
        realism: { reference: "realism.user" },
      },
    });
    expect(second).toEqual(first);
    expect(migrateProjectStateV2ToV3(first)).toBe(first);
  });

  it("keeps the complete V3 factory baseline semantic and free of prompt paragraphs", () => {
    expect(createCanonicalProjectStateV3Values()).toMatchObject({
      model: { behaviour: "modelBehaviour.authentic_lifestyle" },
      realism: { reference: "realism.reference" },
    });
    expect(JSON.stringify(createCanonicalProjectStateV3Values())).not.toMatch(/[.!?]\s/u);
  });

  it("adds only missing editable face facts when migrating V3 to V4", () => {
    const v3: DomainObject = {
      schemaVersion: 3,
      values: {
        character: { faceShape: "faceShape.user", custom: "kept" },
        model: { behaviour: "modelBehaviour.user" },
      },
    };

    expect(migrateProjectStateV3ToV4(v3)).toEqual({
      schemaVersion: 4,
      values: {
        character: {
          faceShape: "faceShape.user",
          eyeShape: "eyeShape.almond",
          noseShape: "noseShape.straight",
          faceAge: "faceAge.adult",
          custom: "kept",
        },
        model: { behaviour: "modelBehaviour.user" },
      },
    });
  });

  it("adds only a missing editable additional-person fact when migrating V4 to V5", () => {
    const missing: DomainObject = { schemaVersion: 4, values: { scene: { location: "location.user" }, custom: "kept" } };
    const explicitFalse: DomainObject = { schemaVersion: 4, values: { scene: { additionalPerson: false } } };
    const explicitTrue: DomainObject = { schemaVersion: 4, values: { scene: { additionalPerson: true } } };

    const migratedMissing = migrateProjectStateV4ToV5(missing);
    expect(migratedMissing).toEqual({
      schemaVersion: 5,
      values: { scene: { location: "location.user", additionalPerson: false }, custom: "kept" },
    });
    expect(migrateProjectStateV4ToV5(explicitFalse)).toEqual({ schemaVersion: 5, values: { scene: { additionalPerson: false } } });
    expect(migrateProjectStateV4ToV5(explicitTrue)).toEqual({ schemaVersion: 5, values: { scene: { additionalPerson: true } } });
    expect(migrateProjectStateV4ToV5(migratedMissing)).toBe(migratedMissing);
    expect(migrateProjectStateV4ToV5(missing)).toEqual(migrateProjectStateV4ToV5(missing));
  });

  it("chains V1 through V4 to V5 deterministically and leaves V5 identical", () => {
    for (const input of [
      { schemaVersion: 1, values: { character: { faceShape: "faceShape.user" } } },
      { schemaVersion: 2, values: { character: { eyeShape: "eyeShape.user" } } },
      { schemaVersion: 3, values: { character: { noseShape: "noseShape.user" } } },
      { schemaVersion: 4, values: { scene: { additionalPerson: true } } },
    ] satisfies DomainObject[]) {
      const first = migrateProjectStateToCurrent(input);
      const second = migrateProjectStateToCurrent(input);
      expect(first).toMatchObject({ schemaVersion: 5, values: { scene: { additionalPerson: expect.any(Boolean) } } });
      expect(second).toEqual(first);
      expect(migrateProjectStateToCurrent(first)).toBe(first);
    }
  });

  it("keeps the V4 factory baseline semantic and free of prompt paragraphs", () => {
    expect(createCanonicalProjectStateV4Values()).toMatchObject({
      character: {
        faceShape: "faceShape.oval",
        eyeShape: "eyeShape.almond",
        noseShape: "noseShape.straight",
        faceAge: "faceAge.adult",
      },
    });
    expect(JSON.stringify(createCanonicalProjectStateV4Values())).not.toMatch(/[.!?]\s/u);
  });

  it("creates new projects directly with the editable V5 additional-person baseline", () => {
    const project = createNewProject(createFixedRuntime().runtime);

    expect(project.state).toMatchObject({
      schemaVersion: 5,
      values: { scene: { additionalPerson: false } },
    });
    expect(JSON.stringify(project.state.values)).not.toContain("Keine zusätzliche Person");
    expect(JSON.stringify(project.state.values)).not.toContain("Do not add any additional people");
  });

  it("keeps the V5 factory baseline semantic and free of prompt paragraphs", () => {
    expect(createCanonicalProjectStateV5Values()).toMatchObject({ scene: { additionalPerson: false } });
    expect(JSON.stringify(createCanonicalProjectStateV5Values())).not.toMatch(/[.!?]\s/u);
  });
});
