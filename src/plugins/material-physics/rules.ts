import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
import type { DomainObject, DomainValue } from "../../domain/entities/project";
const PLUGIN_ID = "material-physics";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  { id: "material-physics.material", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the selected garment material.", evaluate: ({ facts }) => { const material = nestedString(facts.values, "garment", "material"); return material === undefined ? [] : [{ path: "material.fabric", sourceField: "garment.material", value: material }]; } },
  { id: "material-physics.denim-physics", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Derives denim fold behaviour from the selected material.", evaluate: ({ facts }) => nestedString(facts.values, "garment", "material") === "Denim" ? [{ path: "material.physics", sourceField: "garment.material", value: "structured natural folds" }] : [] },
  activeMaterialSlotsRule(),
  tracedGarmentMaterial("upper"),
  tracedGarmentMaterial("lower"),
  tracedGarmentMaterial("footwear"),
  lowerMaterialPresentationRule(),
  adaptivePhysicalContextRule(),
];
export const materialPhysicsProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };

function tracedGarmentMaterial(garment: "upper" | "lower" | "footwear"): ConstraintRule {
  return {
    id: `material-physics.${garment}-material`,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: `Preserves the selected ${garment} material.`,
    evaluate: ({ facts, resolvedValues }) => {
      const explicit = nestedGarmentString(resolvedValues, garment, "material");
      const material = explicit ?? nestedGarmentString(facts.values, garment, "material");
      if (material === undefined) return [];
      if (explicit !== undefined && garment === "lower" && topLevelString(facts.values, "pantsMaterial") !== undefined) {
        return [{
          path: `material.${garment}`,
          sourceFields: ["pantsMaterial", "pantsMaterialMode"],
          value: material,
        }];
      }
      const sourceField = explicit !== undefined && garment === "upper" && topLevelString(facts.values, "tshirtMaterial") !== undefined
        ? "tshirtMaterial"
        : `garment.${garment}.material`;
      return [{
        path: `material.${garment}`,
        sourceField,
        value: material,
      }];
    },
  };
}

function lowerMaterialPresentationRule(): ConstraintRule {
  return {
    id: "material-physics.lower-presentation",
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: "Preserves the explicit physical presentation of the selected lower garment.",
    evaluate: ({ facts }) => {
      const fields = [
        "materialEngine.byGarment.pants.opacity",
        "materialEngine.byGarment.pants.presentation",
        "materialEngine.byGarment.pants.realism",
        "materialEngine.byGarment.pants.surface",
      ] as const;
      const values = fields.map((path) => readString(facts.values, path));
      if (values.every((value) => value === undefined)) return [];
      if (values.some((value) => value === undefined)) throw new Error("Incomplete lower material presentation");
      const [opacity, presentation, realism, surface] = values as [string, string, string, string];
      return [{
        path: "material.lowerPresentation",
        sourceFields: [...fields],
        value: { opacity, presentation, realism, surface },
      }];
    },
  };
}

function activeMaterialSlotsRule(): ConstraintRule {
  return {
    id: "material-physics.active-material-slots",
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: "Selects the resolved upper and lower material slots that contribute physical-material output.",
    evaluate: ({ facts, resolvedValues }) => {
      const explicitUpper = nestedGarmentString(resolvedValues, "upper", "material");
      const hasExplicitLowerSelection = topLevelString(facts.values, "lowerGarmentCategoryId") !== undefined;
      if (explicitUpper !== undefined && hasExplicitLowerSelection) {
        return [{
          path: "material.activeSlots",
          sourceFields: ["lowerGarmentCategoryId", "tshirtMaterial"],
          value: ["upper"],
        }];
      }
      const slots = [
        nestedGarmentString(facts.values, "upper", "material") === undefined ? undefined : "upper",
        nestedGarmentString(facts.values, "lower", "material") === undefined ? undefined : "lower",
      ].filter((slot): slot is string => slot !== undefined);
      const sources = slots.map((slot) => `garment.${slot}.material`);
      if (slots.length === 0) return [];
      return sources.length === 1
        ? [{ path: "material.activeSlots", sourceField: sources[0]!, value: slots }]
        : [{ path: "material.activeSlots", sourceFields: sources as [string, string, ...string[]], value: slots }];
    },
  };
}

function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }

function nestedGarmentString(value: unknown, garment: string, field: string): string | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const garmentRoot = (value as Readonly<Record<string, unknown>>).garment;
  if (garmentRoot === null || Array.isArray(garmentRoot) || typeof garmentRoot !== "object") return undefined;
  const item = (garmentRoot as Readonly<Record<string, unknown>>)[garment];
  if (item === null || Array.isArray(item) || typeof item !== "object") return undefined;
  const candidate = (item as Readonly<Record<string, unknown>>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}

function topLevelString(value: unknown, field: string): string | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const candidate = (value as Readonly<Record<string, unknown>>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}

function adaptivePhysicalContextRule(): ConstraintRule {
  return {
    id: "material-physics.adaptive-physical-context",
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: "Combines present physical inputs into one traceable adaptive context.",
    evaluate: ({ facts }) => {
      const groups = [
        contextGroup("camera", facts.values, [["device", "camera.device"], ["lens", "camera.lens"], ["photoLook", "camera.photoLook"], ["style", "camera.style"]]),
        contextGroup("hair", facts.values, [["style", "character.hair.style"], ["texture", "character.hair.texture"]]),
        contextGroup("materials", facts.values, [["footwear", "garment.footwear.material"], ["lower", "garment.lower.material"], ["upper", "garment.upper.material"]]),
        contextGroup("lighting", facts.values, [["setup", "lighting.setup"], ["source", "lighting.source"], ["whiteBalance", "lighting.whiteBalance"]]),
        contextGroup("pose", facts.values, [["position", "pose.position"]]),
      ].filter((group) => Object.keys(group.values).length > 0);
      const sourceFields = groups.flatMap((group) => group.sourceFields);
      if (sourceFields.length < 2) return [];

      return [{
        path: "material.adaptivePhysicalContext",
        sourceFields: sourceFields as [string, string, ...string[]],
        value: Object.fromEntries(groups.map((group) => [group.name, group.values])),
      }];
    },
  };
}

function contextGroup(name: string, facts: DomainObject, fields: readonly (readonly [string, string])[]) {
  const entries = fields.flatMap(([field, path]) => {
    const value = readString(facts, path);
    return value === undefined ? [] : [[field, value] as const];
  });
  return {
    name,
    sourceFields: fields.map(([, path]) => path).filter((path) => readString(facts, path) !== undefined),
    values: Object.fromEntries(entries) as Readonly<Record<string, DomainValue>>,
  };
}

function readString(values: DomainObject, path: string): string | undefined {
  const value = path.split(".").reduce<DomainValue | undefined>((current, segment) => {
    if (current === null || Array.isArray(current) || typeof current !== "object") return undefined;
    return (current as Readonly<Record<string, DomainValue>>)[segment];
  }, values);
  return typeof value === "string" ? value : undefined;
}
