import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";

const PLUGIN_ID = "character-sheet";
const VERSION = "1.0.0";

const rules: readonly ConstraintRule[] = [
  {
    id: "character-sheet.identity", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "facts", conflictStrategy: "reject", description: "Keeps the supplied character name in the resolved character sheet.",
    evaluate: ({ facts }) => {
      const character = objectAt(facts.values, "character");
      return typeof character?.name === "string" ? [{ path: "character.name", sourceField: "character.name", value: character.name }] : [];
    },
  },
  {
    id: "character-sheet.adult-status", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "facts", conflictStrategy: "reject", description: "Records the supplied character age and its adult status.",
    evaluate: ({ facts }) => {
      const character = objectAt(facts.values, "character");
      return typeof character?.age === "number" ? [
        { path: "character.age", sourceField: "character.age", value: character.age },
        { path: "character.adult", sourceField: "character.age", value: character.age >= 18 },
      ] : [];
    },
  },
];

export const characterSheetProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const candidate = value as Readonly<Record<string, unknown>>;
  const child = candidate[key];
  return child !== null && !Array.isArray(child) && typeof child === "object" ? child as Readonly<Record<string, unknown>> : undefined;
}
