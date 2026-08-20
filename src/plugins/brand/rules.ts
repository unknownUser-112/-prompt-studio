import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "brand";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [
  brandValueRule("brand.name", "name", ({ values }) => selectedBrand(values)),
  brandValueRule("brand.garment-binding", "allowedGarment", ({ values }) => {
    const selected = selectedBrand(values);
    return selected === undefined ? undefined : { sourceField: selected.sourceField, value: selected.garment };
  }),
  brandValueRule("brand.model", "model", ({ values }) => tracedValue(topLevelString(values, "shoesModel"), "shoesModel")),
  brandValueRule("brand.visibility", "visibility", ({ values }) => selectedBrand(values) === undefined ? undefined : tracedValue(topLevelString(values, "brandVisibility"), "brandVisibility")),
  brandValueRule("brand.placement", "placement", ({ values }) => selectedBrand(values) === undefined ? undefined : tracedValue(topLevelString(values, "brandPlacement"), "brandPlacement")),
  {
    id: "brand.footwear-material-binding",
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: "Applies the V500-authoritative physical material for the selected branded footwear model.",
    evaluate: ({ facts }) => topLevelString(facts.values, "shoesBrand") === "Nike"
      && topLevelString(facts.values, "shoesModel") === "Air Force 1"
      ? [{
        path: "garment.footwear.material",
        sourceFields: ["shoesBrand", "shoesModel"],
        value: "material.smooth_leather",
      }]
      : [],
  },
];
export const brandProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };

type SelectedValue = { readonly sourceField: string; readonly value: string };
type BrandSelection = SelectedValue & { readonly garment: "footwear" | "outer" | "upper" };

function brandValueRule(
  id: string,
  field: string,
  select: (facts: { readonly values: unknown }) => SelectedValue | undefined,
): ConstraintRule {
  return {
    id,
    version: VERSION,
    sourcePluginId: PLUGIN_ID,
    phase: "constraints",
    conflictStrategy: "reject",
    description: `Keeps brand.${field} traceable.`,
    evaluate: ({ facts }) => {
      const selected = select(facts);
      return selected === undefined ? [] : [{ path: `brand.${field}`, sourceField: selected.sourceField, value: selected.value }];
    },
  };
}

function selectedBrand(values: unknown): BrandSelection | undefined {
  const upper = topLevelString(values, "tshirtBrand");
  if (upper !== undefined) return { garment: "upper", sourceField: "tshirtBrand", value: upper };
  const footwear = topLevelString(values, "shoesBrand");
  if (footwear !== undefined) return { garment: "footwear", sourceField: "shoesBrand", value: footwear };
  const legacy = nestedString(values, "garment", "brand");
  return legacy === undefined ? undefined : { garment: "outer", sourceField: "garment.brand", value: legacy };
}

function tracedValue(value: string | undefined, sourceField: string): SelectedValue | undefined {
  return value === undefined ? undefined : { sourceField, value };
}

function topLevelString(value: unknown, field: string): string | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const candidate = (value as Readonly<Record<string, unknown>>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}
function nestedString(value: unknown, first: string, second: string): string | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "string" ? (child as Readonly<Record<string, unknown>>)[second] as string : undefined; }
