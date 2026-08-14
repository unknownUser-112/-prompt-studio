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
      const selected = explicitWeatherContextFact(facts.values, domain, field)
        ?? terraceContextFact(facts.values, domain, field)
        ?? (domain === "scene" && field === "location"
          ? flatSceneFact(facts.values, "location", "scene.location")
          : domain === "scene" && field === "area"
            ? flatSceneFact(facts.values, "locationArea", "scene.area")
            : tracedValue(nestedString(facts.values, domain, field), `${domain}.${field}`));
      return selected === undefined ? [] : [{
        path: `${domain}.${field}`,
        ...(selected.sourceFields === undefined ? { sourceField: selected.sourceField! } : { sourceFields: selected.sourceFields }),
        value: selected.value,
      }];
    },
  };
}

type SelectedFact = {
  readonly sourceField?: string;
  readonly sourceFields?: readonly [string, string, ...string[]];
  readonly value: string;
};

function explicitWeatherContextFact(values: unknown, domain: "scene" | "lighting", field: string): SelectedFact | undefined {
  const path = `${domain}.${field}`;
  const location = topLevelString(values, "location");
  const area = topLevelString(values, "locationArea");
  if (path === "scene.mood" && location === "Strand" && area === "Bewölkter Strand · diffuse Atmosphäre") {
    return { sourceFields: ["location", "locationArea"], value: "mood.warm_balanced_travel" };
  }

  const overcast = manualWeatherCondition(values) === "Bewölkt";
  if (path === "scene.atmosphere" && overcast) {
    return {
      sourceFields: [
        "featureSelections.weather.condition.enabled",
        "featureSelections.weather.condition.intensity",
        "weatherMode",
      ],
      value: "atmosphere.overcast_calm_clear",
    };
  }
  if ((path === "lighting.source" || path === "lighting.setup")
    && overcast
    && topLevelString(values, "lightMode") === "Erweitert"
    && topLevelString(values, "primaryLight") === "Direkte Sonne") {
    return {
      sourceFields: [
        "featureSelections.weather.condition.enabled",
        "featureSelections.weather.condition.intensity",
        "lightMode",
        "primaryLight",
        "weatherMode",
      ],
      value: path === "lighting.source" ? "Bewölkter Himmel" : "lighting.diffuse_overcast",
    };
  }
  if (path === "lighting.whiteBalance" && topLevelString(values, "primaryLight") === "Direkte Sonne") {
    return { sourceField: "primaryLight", value: "whiteBalance.late_day_warm" };
  }
  return undefined;
}

function manualWeatherCondition(values: unknown): string | undefined {
  if (topLevelString(values, "weatherMode") !== "Manuell") return undefined;
  const featureSelections = objectAt(values, "featureSelections");
  const weather = objectAt(featureSelections, "weather");
  const condition = objectAt(weather, "condition");
  return condition?.enabled === true && typeof condition.intensity === "string" ? condition.intensity : undefined;
}

function terraceContextFact(values: unknown, domain: "scene" | "lighting", field: string): SelectedFact | undefined {
  const location = flatSceneFact(values, "location", "scene.location");
  const area = flatSceneFact(values, "locationArea", "scene.area");
  if (location?.value !== "Terrasse" || area?.value !== "Terrasse eines Stadthauses · ruhig und privat") return undefined;
  const contextValues: Readonly<Record<string, string>> = {
    "scene.mood": "mood.balanced_summery_casual_travel",
    "scene.atmosphere": "atmosphere.warm_sunny_light_breeze",
    "lighting.source": "lightSource.direct_sunlight",
    "lighting.setup": "lighting.hard_side_sunlight",
  };
  const value = contextValues[`${domain}.${field}`];
  if (value === undefined) return undefined;
  return { sourceFields: [location.sourceField!, area.sourceField!].sort() as [string, string], value };
}

function flatSceneFact(values: unknown, flatField: string, nestedField: string): SelectedFact | undefined {
  return tracedValue(topLevelString(values, flatField), flatField)
    ?? tracedValue(nestedString(values, "scene", nestedField.slice("scene.".length)), nestedField);
}

function tracedValue(value: string | undefined, sourceField: string): SelectedFact | undefined {
  return value === undefined ? undefined : { sourceField, value };
}

function topLevelString(value: unknown, field: string): string | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const candidate = (value as Readonly<Record<string, unknown>>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}

function objectAt(value: unknown, field: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const candidate = (value as Readonly<Record<string, unknown>>)[field];
  return candidate !== null && !Array.isArray(candidate) && typeof candidate === "object"
    ? candidate as Readonly<Record<string, unknown>>
    : undefined;
}

function nestedString(value: unknown, domain: string, field: string): string | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const domainValue = (value as Readonly<Record<string, unknown>>)[domain];
  if (domainValue === null || Array.isArray(domainValue) || typeof domainValue !== "object") return undefined;
  const candidate = (domainValue as Readonly<Record<string, unknown>>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}
