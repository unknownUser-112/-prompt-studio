import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";

const PLUGIN_ID = "selfie";
const VERSION = "1.0.0";
const BINDING_SOURCES: readonly [string, string] = ["selfieMode.enabled", "selfieMode.type"];

const rules: readonly ConstraintRule[] = [
  {
    id: "selfie.enabled", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the explicit selfie-mode enabled value.",
    evaluate: ({ facts }) => {
      if (hasSelfieModeInput(facts.values)) {
        const value = selfieModeValue(facts.values, "enabled");
        return typeof value === "boolean" ? [{ path: "selfieMode.enabled", sourceField: "selfieMode.enabled", value }] : [];
      }
      return legacySelfieEnabled(facts.values)
        ? [{ path: "camera.selfie", sourceField: "camera.selfie", value: true }]
        : [];
    },
  },
  {
    id: "selfie.type", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the explicit selfie capture type.",
    evaluate: ({ facts }) => {
      const value = selfieModeValue(facts.values, "type");
      return typeof value === "string" ? [{ path: "selfieMode.type", sourceField: "selfieMode.type", value }] : [];
    },
  },
  {
    id: "selfie.phone-visibility", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the explicit selfie phone-visibility mode.",
    evaluate: ({ facts }) => {
      const value = selfieModeValue(facts.values, "phoneVisibility");
      return typeof value === "string" ? [{ path: "selfieMode.phoneVisibility", sourceField: "selfieMode.phoneVisibility", value }] : [];
    },
  },
  {
    id: "selfie.camera-binding", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "replace", description: "Enabled front-camera selfies use the smartphone front camera.",
    evaluate: ({ facts }) => {
      if (hasSelfieModeInput(facts.values)) {
        return isFrontSelfie(facts.values)
          ? [{ path: "camera.device", sourceFields: BINDING_SOURCES, value: "smartphone front camera" }]
          : [];
      }
      return legacySelfieEnabled(facts.values)
        ? [{ path: "camera.device", sourceField: "camera.selfie", value: "smartphone" }]
        : [];
    },
  },
  {
    id: "selfie.framing-binding", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "replace", description: "Enabled front-camera selfies use upper-body arm-length framing.",
    evaluate: ({ facts }) => {
      if (hasSelfieModeInput(facts.values)) {
        return isFrontSelfie(facts.values)
          ? [{ path: "camera.framing", sourceFields: BINDING_SOURCES, value: "upper-body frame with a natural camera distance" }]
          : [];
      }
      return legacySelfieEnabled(facts.values)
        ? [{ path: "camera.framing", sourceField: "camera.selfie", value: "arm-length selfie" }]
        : [];
    },
  },
];

export const selfieProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };

function isFrontSelfie(values: unknown): boolean {
  return selfieModeValue(values, "enabled") === true && selfieModeValue(values, "type") === "selfie.front";
}

function hasSelfieModeInput(value: unknown): boolean {
  return value !== null
    && !Array.isArray(value)
    && typeof value === "object"
    && Object.prototype.hasOwnProperty.call(value, "selfieMode");
}

function legacySelfieEnabled(value: unknown): boolean {
  if (value === null || Array.isArray(value) || typeof value !== "object") return false;
  const camera = (value as Readonly<Record<string, unknown>>).camera;
  return camera !== null
    && !Array.isArray(camera)
    && typeof camera === "object"
    && (camera as Readonly<Record<string, unknown>>).selfie === true;
}

function selfieModeValue(value: unknown, field: string): unknown {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const mode = (value as Readonly<Record<string, unknown>>).selfieMode;
  return mode !== null && !Array.isArray(mode) && typeof mode === "object"
    ? (mode as Readonly<Record<string, unknown>>)[field]
    : undefined;
}
