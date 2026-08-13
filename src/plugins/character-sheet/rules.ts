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
  ...[
    "gender",
    "heightCentimeters",
    "bodyBuild",
    "chestVolume",
    "chestShape",
    "lowerBody",
    "skinTone",
    "eyeColor",
    "faceShape",
    "eyeShape",
    "noseShape",
    "faceAge",
  ].map((field) => tracedCharacterFact(field)),
  ...["color", "length", "texture", "style"].map((field) => tracedHairFact(field)),
  ...["position", "gaze", "expression"].map((field) => tracedPoseFact(field)),
];

export const characterSheetProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const candidate = value as Readonly<Record<string, unknown>>;
  const child = candidate[key];
  return child !== null && !Array.isArray(child) && typeof child === "object" ? child as Readonly<Record<string, unknown>> : undefined;
}

function tracedCharacterFact(field: string): ConstraintRule {
  return {
    id: `character-sheet.${field}`,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "facts",
    conflictStrategy: "reject",
    description: `Keeps character.${field} traceable.`,
    evaluate: ({ facts }) => {
      const value = objectAt(facts.values, "character")?.[field];
      return typeof value === "string" || typeof value === "number"
        ? [{ path: `character.${field}`, sourceField: `character.${field}`, value }]
        : [];
    },
  };
}

function tracedHairFact(field: string): ConstraintRule {
  return {
    id: `character-sheet.hair.${field}`,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "facts",
    conflictStrategy: "reject",
    description: `Keeps character.hair.${field} traceable.`,
    evaluate: ({ facts }) => {
      const hair = objectAt(objectAt(facts.values, "character"), "hair");
      const value = hair?.[field];
      return typeof value === "string"
        ? [{ path: `character.hair.${field}`, sourceField: `character.hair.${field}`, value }]
        : [];
    },
  };
}

function tracedPoseFact(field: string): ConstraintRule {
  return {
    id: `character-sheet.pose-${field}`,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "facts",
    conflictStrategy: "reject",
    description: `Keeps pose.${field} traceable.`,
    evaluate: ({ facts }) => {
      const value = objectAt(facts.values, "pose")?.[field];
      return typeof value === "string"
        ? [{ path: `pose.${field}`, sourceField: `pose.${field}`, value }]
        : [];
    },
  };
}
