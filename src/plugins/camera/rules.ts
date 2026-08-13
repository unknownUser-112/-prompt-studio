import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "camera";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  { id: "camera.device", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Keeps the selected capture device traceable.", evaluate: ({ facts }) => { const device = nestedString(facts.values, "camera", "device"); return device === undefined ? [] : [{ path: "camera.device", sourceField: "camera.device", value: device }]; } },
  { id: "camera.overcast-light-binding", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "replace", description: "Overcast weather uses the V500.6.11 overcast-sky light source.", evaluate: ({ facts }) => nestedString(facts.values, "lighting", "weather") === "Bewölkt" ? [{ path: "lighting.source", sourceField: "lighting.weather", value: "Bewölkter Himmel" }] : [] },
];
export const cameraProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };
function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }
