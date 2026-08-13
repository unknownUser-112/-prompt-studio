import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";

const PLUGIN_ID = "scene-lighting";
const VERSION = "1.0.0";

const rules: readonly ConstraintRule[] = [
  ...["location", "area", "mood", "atmosphere", "surfaceCondition"].map((field) => tracedFact("scene", field)),
  ...["source", "setup", "whiteBalance"].map((field) => tracedFact("lighting", field)),
];

export const sceneLightingProvider: ConstraintProvider = {
  id: PLUGIN_ID,
  version: VERSION,
  sourcePluginId: PLUGIN_ID,
  rules: () => rules,
};

function tracedFact(domain: "scene" | "lighting", field: string): ConstraintRule {
  const ruleField = field.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
  return {
    id: `${PLUGIN_ID}.${domain}-${ruleField}`,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: `Preserves ${domain}.${field}.`,
    evaluate: ({ facts }) => {
      const value = nestedString(facts.values, domain, field);
      return value === undefined ? [] : [{
        path: `${domain}.${field}`,
        sourceField: `${domain}.${field}`,
        value,
      }];
    },
  };
}

function nestedString(value: unknown, domain: string, field: string): string | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const domainValue = (value as Readonly<Record<string, unknown>>)[domain];
  if (domainValue === null || Array.isArray(domainValue) || typeof domainValue !== "object") return undefined;
  const candidate = (domainValue as Readonly<Record<string, unknown>>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}
