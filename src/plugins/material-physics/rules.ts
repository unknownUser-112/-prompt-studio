import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
import type { DomainObject, DomainValue } from "../../domain/entities/project";
const PLUGIN_ID = "material-physics";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  { id: "material-physics.material", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the selected garment material.", evaluate: ({ facts }) => { const material = nestedString(facts.values, "garment", "material"); return material === undefined ? [] : [{ path: "material.fabric", sourceField: "garment.material", value: material }]; } },
  { id: "material-physics.denim-physics", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Derives denim fold behaviour from the selected material.", evaluate: ({ facts }) => nestedString(facts.values, "garment", "material") === "Denim" ? [{ path: "material.physics", sourceField: "garment.material", value: "structured natural folds" }] : [] },
  tracedGarmentMaterial("upper"),
  tracedGarmentMaterial("lower"),
  tracedGarmentMaterial("footwear"),
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
    evaluate: ({ facts }) => {
      const material = nestedGarmentString(facts.values, garment, "material");
      return material === undefined ? [] : [{
        path: `material.${garment}`,
        sourceField: `garment.${garment}.material`,
        value: material,
      }];
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
