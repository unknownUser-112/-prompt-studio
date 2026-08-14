import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";

const PLUGIN_ID = "additional-person";
const VERSION = "1.0.0";

const rules: readonly ConstraintRule[] = [
  tracedAdditionalPersonFact("activity", "string"),
  tracedAdditionalPersonFact("enabled", "boolean"),
  tracedAdditionalPersonFact("position", "string"),
  tracedAdditionalPersonFact("type", "string"),
  {
    id: "additional-person.presence",
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: "Resolves explicit additional-person presence ahead of the canonical baseline presence fact.",
    evaluate: ({ facts }) => {
      const explicit = nestedValue(facts.values, "additionalPerson", "enabled");
      if (typeof explicit === "boolean") {
        return [{ path: "scene.additionalPerson", sourceField: "additionalPerson.enabled", value: explicit }];
      }
      const baseline = nestedValue(facts.values, "scene", "additionalPerson");
      return typeof baseline === "boolean"
        ? [{ path: "scene.additionalPerson", sourceField: "scene.additionalPerson", value: baseline }]
        : [];
    },
  },
];

export const additionalPersonProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };

function tracedAdditionalPersonFact(field: string, valueType: "boolean" | "string"): ConstraintRule {
  return {
    id: `additional-person.${field}`,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: `Keeps additionalPerson.${field} traceable.`,
    evaluate: ({ facts }) => {
      const value = nestedValue(facts.values, "additionalPerson", field);
      if (valueType === "boolean") {
        return typeof value === "boolean"
          ? [{ path: `additionalPerson.${field}`, sourceField: `additionalPerson.${field}`, value }]
          : [];
      }
      return typeof value === "string"
        ? [{ path: `additionalPerson.${field}`, sourceField: `additionalPerson.${field}`, value }]
        : [];
    },
  };
}

function nestedValue(value: unknown, first: string, second: string): unknown {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[first];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? (child as Readonly<Record<string, unknown>>)[second]
    : undefined;
}
