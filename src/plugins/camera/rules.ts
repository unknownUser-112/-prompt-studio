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
      const selected = field === "framing"
        ? flatFramingFact(facts.values)
        : tracedValue(nestedString(facts.values, "camera", field), `camera.${field}`);
      return selected === undefined
        ? []
        : [{ path: `camera.${field}`, sourceField: selected.sourceField, value: selected.value }];
    },
  };
}

function flatFramingFact(values: unknown): { readonly sourceField: string; readonly value: string } | undefined {
  return tracedValue(topLevelString(values, "framingV5Id"), "framingV5Id")
    ?? tracedValue(topLevelString(values, "framing"), "framing")
    ?? tracedValue(nestedString(values, "camera", "framing"), "camera.framing");
}

function tracedValue(value: string | undefined, sourceField: string): { readonly sourceField: string; readonly value: string } | undefined {
  return value === undefined ? undefined : { sourceField, value };
}

function topLevelString(value: unknown, field: string): string | undefined {
  return value !== null && !Array.isArray(value) && typeof value === "object" && typeof (value as Readonly<Record<string, unknown>>)[field] === "string"
    ? (value as Readonly<Record<string, unknown>>)[field] as string
    : undefined;
}

function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }
