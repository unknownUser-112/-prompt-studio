import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "model-behaviour";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  { id: "model-behaviour.selection", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "model-behaviour", conflictStrategy: "reject", description: "Preserves the selected model behaviour without a plugin default.", evaluate: ({ facts }) => { const behaviour = nestedString(facts.values, "model", "behaviour"); return behaviour === undefined ? [] : [{ path: "model.behaviour", sourceField: "model.behaviour", value: behaviour }]; } },
  {
    id: "model-behaviour.execution",
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "model-behaviour",
    conflictStrategy: "reject",
    description: "Resolves the explicit image-generation execution instruction without enabling it by default.",
    evaluate: ({ facts }) => {
      const enabled = topLevelBoolean(facts.values, "executionInstruction");
      return enabled === undefined ? [] : [{
        path: "model.execution",
        sourceField: "executionInstruction",
        value: enabled ? "execution.generate_single_image" : "execution.disabled",
      }];
    },
  },
];
export const modelBehaviourProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };
function topLevelBoolean(value: unknown, field: string): boolean | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const candidate = (value as Readonly<Record<string, unknown>>)[field]; return typeof candidate === "boolean" ? candidate : undefined; }
function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }
