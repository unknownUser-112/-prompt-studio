import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "selfie";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  { id: "selfie.enabled", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the explicit selfie request.", evaluate: ({ facts }) => nestedBoolean(facts.values, "camera", "selfie") === true ? [{ path: "camera.selfie", sourceField: "camera.selfie", value: true }] : [] },
  { id: "selfie.camera-binding", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "replace", description: "Selfies use a smartphone capture device.", evaluate: ({ facts }) => nestedBoolean(facts.values, "camera", "selfie") === true ? [{ path: "camera.device", sourceField: "camera.selfie", value: "smartphone" }] : [] },
  { id: "selfie.framing-binding", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Selfies use arm-length framing.", evaluate: ({ facts }) => nestedBoolean(facts.values, "camera", "selfie") === true ? [{ path: "camera.framing", sourceField: "camera.selfie", value: "arm-length selfie" }] : [] },
];
export const selfieProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };
function nestedBoolean(value: unknown, first: string, second: string): boolean | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "boolean" ? (child as Readonly<Record<string, unknown>>)[second] as boolean : undefined; }
