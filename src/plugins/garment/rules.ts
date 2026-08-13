import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "garment";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  { id: "garment.outer", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the selected outer garment.", evaluate: ({ facts }) => { const outer = nestedString(facts.values, "garment", "outer"); return outer === undefined ? [] : [{ path: "garment.outer", sourceField: "garment.outer", value: outer }]; } },
  { id: "garment.upper-layer", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Preserves the selected upper layer.", evaluate: ({ facts }) => { const upperLayer = nestedString(facts.values, "garment", "upperLayer"); return upperLayer === undefined ? [] : [{ path: "garment.upperLayer", sourceField: "garment.upperLayer", value: upperLayer }]; } },
  { id: "garment.open-state", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Open outer garments require an explicit upper layer.", evaluate: ({ facts }) => { const outer = nestedString(facts.values, "garment", "outer"); if (outer === undefined || !/\bopen\b/iu.test(outer)) return []; if (nestedString(facts.values, "garment", "upperLayer") === undefined) throw new Error("Open garment requires an upper layer"); return [{ path: "garment.open", sourceField: "garment.outer", value: true }]; } },
  tracedGarmentItemFact("upper", "kind"),
  tracedGarmentItemFact("upper", "color"),
  tracedGarmentItemFact("lower", "kind"),
  tracedGarmentItemFact("lower", "color"),
  tracedGarmentItemFact("footwear", "kind"),
  tracedGarmentItemFact("footwear", "color"),
  {
    id: "garment.outfit-build",
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: "Preserves the selected outfit build.",
    evaluate: ({ facts }) => {
      const value = nestedString(facts.values, "garment", "outfitBuild");
      return value === undefined ? [] : [{ path: "garment.outfitBuild", sourceField: "garment.outfitBuild", value }];
    },
  },
];
export const garmentProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };

function tracedGarmentItemFact(item: "upper" | "lower" | "footwear", field: "kind" | "color"): ConstraintRule {
  return {
    id: `garment.${item}-${field}`,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: `Preserves garment.${item}.${field}.`,
    evaluate: ({ facts }) => {
      const value = nestedItemString(facts.values, item, field);
      return value === undefined ? [] : [{
        path: `garment.${item}.${field}`,
        sourceField: `garment.${item}.${field}`,
        value,
      }];
    },
  };
}

function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }

function nestedItemString(value: unknown, item: string, field: string): string | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const garment = (value as Readonly<Record<string, unknown>>).garment;
  if (garment === null || Array.isArray(garment) || typeof garment !== "object") return undefined;
  const garmentItem = (garment as Readonly<Record<string, unknown>>)[item];
  if (garmentItem === null || Array.isArray(garmentItem) || typeof garmentItem !== "object") return undefined;
  const candidate = (garmentItem as Readonly<Record<string, unknown>>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}
