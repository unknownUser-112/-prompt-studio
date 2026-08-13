import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "camera";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  tracedCameraFact("camera.device", "device"),
  tracedCameraFact("camera.framing", "framing"),
  tracedCameraFact("camera.lens", "lens"),
  tracedCameraFact("camera.perspective", "perspective"),
  tracedCameraFact("camera.photo-look", "photoLook"),
  tracedCameraFact("camera.style", "style"),
  { id: "camera.overcast-light-binding", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "replace", description: "Overcast weather uses the V500.6.11 overcast-sky light source.", evaluate: ({ facts }) => nestedString(facts.values, "lighting", "weather") === "Bewölkt" ? [{ path: "lighting.source", sourceField: "lighting.weather", value: "Bewölkter Himmel" }] : [] },
];
export const cameraProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };

function tracedCameraFact(id: string, field: string): ConstraintRule {
  return {
    id,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: `Keeps camera.${field} traceable.`,
    evaluate: ({ facts }) => {
      const value = nestedString(facts.values, "camera", field);
      return value === undefined ? [] : [{ path: `camera.${field}`, sourceField: `camera.${field}`, value }];
    },
  };
}

function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }
