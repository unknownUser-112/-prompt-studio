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
      const flatAge = parseNumber(topLevelString(facts.values, "age"));
      const character = objectAt(facts.values, "character");
      const age = flatAge ?? (typeof character?.age === "number" ? character.age : undefined);
      const sourceField = flatAge === undefined ? "character.age" : "age";
      return age === undefined ? [] : [
        { path: "character.age", sourceField, value: age },
        { path: "character.adult", sourceField, value: age >= 18 },
      ];
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
  tracedReferenceModeFact("enabled", "reference-mode-enabled", "boolean"),
  tracedReferenceModeFact("layout", "reference-mode-layout", "string"),
  tracedReferenceModeFact("mode", "reference-mode-mode", "string"),
  tracedReferenceModeFact("purpose", "reference-mode-purpose", "string"),
  tracedReferenceModeFact("sheetType", "reference-mode-sheet-type", "string"),
  tracedReferenceModeFact("singleView", "reference-mode-single-view", "string"),
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
      const flat = flatCharacterValue(facts.values, field);
      const value = flat?.value ?? objectAt(facts.values, "character")?.[field];
      return typeof value === "string" || typeof value === "number"
        ? [{ path: `character.${field}`, sourceField: flat?.sourceField ?? `character.${field}`, value }]
        : [];
    },
  };
}

function flatCharacterValue(
  values: unknown,
  field: string,
): { readonly sourceField: string; readonly value: string | number } | undefined {
  if (field === "heightCentimeters") {
    const value = parseNumber(topLevelString(values, "height"));
    return value === undefined ? undefined : { sourceField: "height", value };
  }
  const definitions: Readonly<Record<string, { readonly sourceField: string; readonly values: Readonly<Record<string, string>> }>> = {
    bodyBuild: { sourceField: "bodyBuild", values: { "Schlank & ausgewogen": "bodyBuild.slim_balanced" } },
    chestVolume: { sourceField: "chestProfile", values: { "Sehr voll": "chestVolume.very_full" } },
    chestShape: { sourceField: "chestShape", values: { "Natürlich ausgewogen": "chestShape.natural_balanced" } },
    lowerBody: { sourceField: "lowerBody", values: { "weich gerundete Hüftsilhouette": "lowerBody.softly_rounded" } },
  };
  const definition = definitions[field];
  if (definition === undefined) return undefined;
  const raw = topLevelString(values, definition.sourceField);
  if (raw === undefined) return undefined;
  return { sourceField: definition.sourceField, value: definition.values[raw] ?? raw };
}

function topLevelString(value: unknown, field: string): string | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const candidate = (value as Readonly<Record<string, unknown>>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
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
      const selected = field === "expression"
        ? flatExpressionFact(facts.values)
        : tracedString(objectAt(facts.values, "pose")?.[field], `pose.${field}`);
      return selected !== undefined
        ? [{ path: `pose.${field}`, sourceField: selected.sourceField, value: selected.value }]
        : [];
    },
  };
}

function flatExpressionFact(values: unknown): { readonly sourceField: string; readonly value: string } | undefined {
  const v5Id = topLevelString(values, "expressionV5Id");
  if (v5Id !== undefined) return tracedString(v5Id, "expressionV5Id");

  const flat = topLevelString(values, "expression");
  if (flat !== undefined) {
    const canonical = canonicalFlatExpression(flat);
    if (canonical === undefined) throw new Error(`Unsupported flat expression input: ${flat}`);
    return tracedString(canonical, "expression");
  }

  return tracedString(objectAt(values, "pose")?.expression, "pose.expression");
}

function canonicalFlatExpression(value: string): string | undefined {
  const canonical: Readonly<Record<string, string>> = {
    "expression.laughing": "expression.laughing",
    "expression.relaxed": "expression.relaxed",
    "mit neutralem, ruhigem Ausdruck": "expression.relaxed",
    "mit ruhigem, neutralem Ausdruck": "expression.relaxed",
    "natürlich lachend": "expression.laughing",
  };
  return canonical[value];
}

function tracedString(value: unknown, sourceField: string): { readonly sourceField: string; readonly value: string } | undefined {
  return typeof value === "string" ? { sourceField, value } : undefined;
}

function tracedReferenceModeFact(
  field: string,
  ruleName: string,
  valueType: "boolean" | "string",
): ConstraintRule {
  return {
    id: `character-sheet.${ruleName}`,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "facts",
    conflictStrategy: "reject",
    description: `Keeps referenceMode.${field} traceable.`,
    evaluate: ({ facts }) => {
      const value = objectAt(facts.values, "referenceMode")?.[field];
      if (valueType === "boolean") {
        return typeof value === "boolean"
          ? [{ path: `referenceMode.${field}`, sourceField: `referenceMode.${field}`, value }]
          : [];
      }
      return typeof value === "string"
        ? [{ path: `referenceMode.${field}`, sourceField: `referenceMode.${field}`, value }]
        : [];
    },
  };
}
