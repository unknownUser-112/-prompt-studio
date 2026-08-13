import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";

const PLUGIN_ID = "adaptive-realism";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [{
  id: "adaptive-realism.reference", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Keeps an explicit realism reference traceable.",
  evaluate: ({ facts }) => typeof nestedString(facts.values, "realism", "reference") === "string" ? [{ path: "realism.reference", sourceField: "realism.reference", value: nestedString(facts.values, "realism", "reference")! }] : [],
}];
export const adaptiveRealismProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };
function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }
