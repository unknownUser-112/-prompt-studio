import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "brand";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  { id: "brand.name", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Records an explicitly requested garment brand.", evaluate: ({ facts }) => { const brand = nestedString(facts.values, "garment", "brand"); return brand === undefined ? [] : [{ path: "brand.name", sourceField: "garment.brand", value: brand }]; } },
  { id: "brand.garment-binding", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Limits requested branding to the declared garment.", evaluate: ({ facts }) => nestedString(facts.values, "garment", "brand") === undefined ? [] : [{ path: "brand.allowedGarment", sourceField: "garment.brand", value: "outer" }] },
];
export const brandProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };
function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }
