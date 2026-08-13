import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "material-physics";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  { id: "material-physics.material", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the selected garment material.", evaluate: ({ facts }) => { const material = nestedString(facts.values, "garment", "material"); return material === undefined ? [] : [{ path: "material.fabric", sourceField: "garment.material", value: material }]; } },
  { id: "material-physics.denim-physics", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Derives denim fold behaviour from the selected material.", evaluate: ({ facts }) => nestedString(facts.values, "garment", "material") === "Denim" ? [{ path: "material.physics", sourceField: "garment.material", value: "structured natural folds" }] : [] },
];
export const materialPhysicsProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };
function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }
