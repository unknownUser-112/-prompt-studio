import { describe, expect, it } from "vitest";

import { migrateProjectStateV1ToV2 } from "../../../src/application/migrations/v600-project-state-v1-to-v2";
import { createCanonicalProjectStateV2Values } from "../../../src/domain/entities/project-factory";
import type { DomainObject } from "../../../src/domain/entities/project";

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
});
