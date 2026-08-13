import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { DomainObject, Project } from "./project";

export interface ProjectCameraBaselineValues extends DomainObject {
  readonly framing: string;
  readonly device: string;
  readonly lens: string;
  readonly perspective: string;
  readonly style: string;
  readonly photoLook: string;
}

export interface ProjectHairBaselineValues extends DomainObject {
  readonly color: string;
  readonly length: string;
  readonly texture: string;
  readonly style: string;
}

export interface ProjectCharacterBaselineValues extends DomainObject {
  readonly gender: string;
  readonly age: number;
  readonly heightCentimeters: number;
  readonly bodyBuild: string;
  readonly chestVolume: string;
  readonly chestShape: string;
  readonly lowerBody: string;
  readonly skinTone: string;
  readonly eyeColor: string;
  readonly hair: ProjectHairBaselineValues;
}

export interface ProjectPoseBaselineValues extends DomainObject {
  readonly position: string;
  readonly gaze: string;
  readonly expression: string;
}

export interface ProjectGarmentItemBaselineValues extends DomainObject {
  readonly kind: string;
  readonly color: string;
  readonly material: string;
}

export interface ProjectGarmentBaselineValues extends DomainObject {
  readonly upper: ProjectGarmentItemBaselineValues;
  readonly lower: ProjectGarmentItemBaselineValues;
  readonly footwear: ProjectGarmentItemBaselineValues;
  readonly outfitBuild: string;
}

export interface ProjectSceneBaselineValues extends DomainObject {
  readonly location: string;
  readonly area: string;
  readonly mood: string;
  readonly atmosphere: string;
  readonly surfaceCondition: string;
}

export interface ProjectLightingBaselineValues extends DomainObject {
  readonly source: string;
  readonly setup: string;
  readonly whiteBalance: string;
}

export interface CanonicalProjectStateV2Values extends DomainObject {
  readonly camera: ProjectCameraBaselineValues;
  readonly character: ProjectCharacterBaselineValues;
  readonly pose: ProjectPoseBaselineValues;
  readonly garment: ProjectGarmentBaselineValues;
  readonly scene: ProjectSceneBaselineValues;
  readonly lighting: ProjectLightingBaselineValues;
}

export function createCanonicalProjectStateV2Values(): CanonicalProjectStateV2Values {
  return {
    camera: {
      framing: "framing.whole_person",
      device: "device.smartphone",
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
      upper: { kind: "upperGarment.classic_tshirt", color: "color.white", material: "material.cotton" },
      lower: { kind: "lowerGarment.high_waist_jeans", color: "color.denim_blue", material: "material.denim" },
      footwear: { kind: "footwear.classic_sneakers", color: "color.white", material: "material.leather_textile" },
      outfitBuild: "outfitBuild.single_clean_layer",
    },
    scene: {
      location: "location.apartment",
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
  };
}

export function createNewProject(_runtime: RuntimeEnvironment, _name = "Neues Projekt"): Project {
  const timestamp = _runtime.clock.now();
  return {
    id: _runtime.idGenerator.nextId("project"),
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 0,
    name: _name,
    state: {
      schemaVersion: 2,
      wizardStep: 1,
      values: createCanonicalProjectStateV2Values(),
      assetIds: [],
    },
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [],
  };
}

export function duplicateProject(runtime: RuntimeEnvironment, source: Project): Project {
  const timestamp = runtime.clock.now();
  return {
    id: runtime.idGenerator.nextId("project"),
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 0,
    name: `${source.name} Kopie`,
    state: cloneValue(source.state),
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [...source.tagIds],
  };
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Readonly<Record<string, unknown>>)
        .map(([key, child]) => [key, cloneValue(child)]),
    ) as T;
  }
  return value;
}
