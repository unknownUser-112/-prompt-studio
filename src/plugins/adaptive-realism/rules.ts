import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
import type { DomainObject, DomainValue } from "../../domain/entities/project";

const PLUGIN_ID = "adaptive-realism";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  {
    id: "adaptive-realism.reference", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Keeps an explicit realism reference traceable.",
    evaluate: ({ facts }) => typeof nestedString(facts.values, "realism", "reference") === "string" ? [{ path: "realism.reference", sourceField: "realism.reference", value: nestedString(facts.values, "realism", "reference")! }] : [],
  },
  {
    id: "adaptive-realism.capture-appearance",
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: "Combines present skin, camera, and realism inputs into a traceable capture appearance.",
    evaluate: ({ facts }) => {
      const fields = [
        ["photoLook", "camera.photoLook"],
        ["photographicCharacter", "camera.style"],
        ["skinTone", "character.skinTone"],
        ["realismReference", "realism.reference"],
      ] as const;
      const present = fields.flatMap(([field, path]) => {
        const value = readString(facts.values, path);
        return value === undefined ? [] : [{ field, path, value }];
      });
      if (present.length < 2) return [];
      const sourceFields = present.map(({ path }) => path).sort();
      return [{
        path: "captureAppearance",
        sourceFields: sourceFields as [string, string, ...string[]],
        value: Object.fromEntries(present.map(({ field, value }) => [field, value])),
      }];
    },
  },
];
export const adaptiveRealismProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };
function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }

function readString(values: DomainObject, path: string): string | undefined {
  const value = path.split(".").reduce<DomainValue | undefined>((current, segment) => {
    if (current === null || Array.isArray(current) || typeof current !== "object") return undefined;
    return (current as Readonly<Record<string, DomainValue>>)[segment];
  }, values);
  return typeof value === "string" ? value : undefined;
}
