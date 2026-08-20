import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_ENVIRONMENT_DE = "in einer modernen Wohnung, im Bereich Wohnzimmer · modern, mit natürlichem Fenster. Die Szene wirkt ruhig und alltäglich. Die Umgebung ist trocken, ohne Nässe-Effekt. Die Bildstimmung wirkt ruhig, ausgeglichen und alltäglich. Es ist trocken und mild, bei Windstille und klar.";
const BASELINE_ENVIRONMENT_EN = "The scene is set in an apartment, specifically a modern living room with natural window light. The mood feels calm, balanced, naturally neutral, everyday, and unposed. Conditions are dry and mild, with calm winds and clear air. The environment is dry, without a wet-look effect.";
const BASELINE_DETAILS_DE = "ein leicht versetztes Sofakissen. ein beiläufig abgelegtes Buch oder Magazin. Vorhangfalten mit kleinen natürlichen Unterschieden. ein nicht exakt mittig ausgerichteter Beistelltisch. Fensterlicht bestimmt gemeinsam die Richtung von Haut-Highlights, Stoffreflexionen, Haarlicht und Schlagschatten. weiche Übergänge besitzen breite Halbschatten und keine widersprüchlichen harten Zweitschatten. kleine nicht-periodische Unregelmäßigkeiten statt wiederholter Muster. dezente Gebrauchsspuren nur dort, wo Material und Nutzung sie plausibel machen. Hintergrundobjekte besitzen konsistente Maßstäbe, Fluchtlinien und gegenseitige Verdeckung. Fensterlicht fällt seitlich ein, wirkt weich und erzeugt weich definierte Schatten bei geringem Kontrast. neutraler Weißabgleich mit natürlichen Hautfarben.";
const BASELINE_DETAILS_EN = "Visible environmental details include a slightly offset cushion, a casually placed book or magazine, curtain folds with small natural differences, a side table that is not perfectly centered, small non-periodic irregularities rather than repeated patterns, subtle signs of use only where material and function make them plausible, and background objects with consistent scale, perspective lines, and mutual occlusion. Window light comes from the side, appears soft, and creates softly defined shadows with low contrast. The image uses a neutral white balance with natural skin tones.";
const BASELINE_NATURAL_DETAILS_DE = "ein leicht versetztes Sofakissen. ein beiläufig abgelegtes Buch oder Magazin. Vorhangfalten mit kleinen natürlichen Unterschieden. ein nicht exakt mittig ausgerichteter Beistelltisch.";
const BASELINE_NATURAL_DETAILS_EN = "Visible environmental details include a slightly offset cushion, a casually placed book or magazine, curtain folds with small natural differences, a side table that is not perfectly centered, small non-periodic irregularities rather than repeated patterns, subtle signs of use only where material and function make them plausible, and background objects with consistent scale, perspective lines, and mutual occlusion.";
const GENERIC_DETAILS_DE = "kleine nicht-periodische Unregelmäßigkeiten statt wiederholter Muster. dezente Gebrauchsspuren nur dort, wo Material und Nutzung sie plausibel machen. Hintergrundobjekte besitzen konsistente Maßstäbe, Fluchtlinien und gegenseitige Verdeckung.";
const GENERIC_DETAILS_EN = "Visible environmental details include small non-periodic irregularities rather than repeated patterns, subtle signs of use only where material and function make them plausible, and background objects with consistent scale, perspective lines, and mutual occlusion.";
const BASELINE_COORDINATION_DE = "Fensterlicht bestimmt gemeinsam die Richtung von Haut-Highlights, Stoffreflexionen, Haarlicht und Schlagschatten. weiche Übergänge besitzen breite Halbschatten und keine widersprüchlichen harten Zweitschatten.";
const DIRECT_COORDINATION_DE = "Direktes Sonnenlicht bestimmt gemeinsam die Richtung von Haut-Highlights, Stoffreflexionen, Haarlicht und Schlagschatten. harte Übergänge erzeugen klar definierte Schatten und ausgeprägten Kontrast.";
const OVERCAST_COORDINATION_DE = "Bewölkter Himmel bestimmt gemeinsam die Richtung von Haut-Highlights, Stoffreflexionen, Haarlicht und Schlagschatten. weiche Übergänge besitzen breite Halbschatten und keine widersprüchlichen harten Zweitschatten.";
const BASELINE_CAPTURE_DE = "Fensterlicht fällt seitlich ein, wirkt weich und erzeugt weich definierte Schatten bei geringem Kontrast.";
const BASELINE_CAPTURE_EN = "Window light comes from the side, appears soft, and creates softly defined shadows with low contrast.";
const DIRECT_CAPTURE_DE = "Direktes Sonnenlicht fällt seitlich ein, wirkt hart und erzeugt klar definierte Schatten mit ausgeprägtem Kontrast.";
const DIRECT_CAPTURE_EN = "Direct sunlight enters from the side, appears hard, and creates clearly defined shadows with pronounced contrast.";
const OVERCAST_CAPTURE_DE = "Diffuses Tageslicht fällt diffus von oben ein, wirkt sehr weich und erzeugt sehr weiche Schatten bei geringem Kontrast.";
const OVERCAST_CAPTURE_EN = "Overcast daylight enters diffusely from above, appears very soft, and creates very soft shadows with low contrast.";
const OVERCAST_DETAILS_DE = "unregelmäßige Fußspuren im Sand. kleine vom Wind geformte Sandstrukturen. natürlich verteilte Stranddetails. leichte Bewegung durch die Brise.";
const OVERCAST_DETAILS_EN = "Visible environmental details include irregular footprints in the sand, small wind-shaped sand structures, naturally distributed beach details, and slight movement from the breeze.";
const BASELINE_WHITE_BALANCE_DE = "neutraler Weißabgleich mit natürlichen Hautfarben.";
const BASELINE_WHITE_BALANCE_EN = "The image uses a neutral white balance with natural skin tones.";
const LATE_DAY_WHITE_BALANCE_DE = "leicht warme Farbtemperatur wie spätes Tageslicht.";
const LATE_DAY_WHITE_BALANCE_EN = "The image uses a slightly warm color temperature reminiscent of late daylight.";
const SOURCE_CONSISTENCY_DE = "Schatten, Reflexionen und Haut-Highlights folgen einer klaren, physikalisch glaubwürdigen Lichtquelle.";
const SOURCE_CONSISTENCY_EN = "Shadows, reflections, and skin highlights must follow one clear, physically plausible light source.";
const COMPACT_APARTMENT_DE = "in einer modernen Wohnung, im Bereich Wohnzimmer · modern, mit natürlichem Fenster. Die Szene wirkt ruhig und alltäglich. Die Umgebung ist trocken, ohne Nässe-Effekt. Fensterlicht fällt seitlich ein, wirkt weich und erzeugt weich definierte Schatten bei geringem Kontrast. neutraler Weißabgleich mit natürlichen Hautfarben.";
const COMPACT_APARTMENT_EN = "Scene in an apartment, specifically modern living room with natural window light. Conditions are dry and mild. Window light enters from the side, appears soft, and creates softly defined shadows with low contrast. A neutral white balance with natural skin tones.";
const COMPACT_TERRACE_DE = "auf einer Terrasse, im Bereich Terrasse eines Stadthauses · ruhig und privat. Es ist sonnig. Direktes Sonnenlicht fällt seitlich ein, wirkt hart und erzeugt klar definierte Schatten mit ausgeprägtem Kontrast. neutraler Weißabgleich mit natürlichen Hautfarben.";
const COMPACT_TERRACE_EN = "Scene on a terrace, specifically townhouse terrace that feels quiet and private. Conditions are sunny. Direct sunlight enters from the side, appears hard, and creates clearly defined shadows with pronounced contrast. A neutral white balance with natural skin tones.";
const COMPACT_BEACH_DE = "an einem Strand, im Bereich Bewölkter Strand · diffuse Atmosphäre. Die Szene wirkt warm und reise-moment. Die Umgebung ist trocken, ohne Nässe-Effekt. Diffuses Tageslicht fällt diffus von oben ein, wirkt sehr weich und erzeugt sehr weiche Schatten bei geringem Kontrast. leicht warme Farbtemperatur wie spätes Tageslicht.";
const COMPACT_BEACH_EN = "Scene on a beach, specifically overcast beach with a diffuse atmosphere. Conditions are overcast. Overcast daylight enters diffusely from above, appears very soft, and creates very soft shadows with low contrast. A slightly warm color temperature reminiscent of late daylight.";

export const sceneLightingSection: PromptSectionProvider = {
  id: "scene-lighting",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const requiredPaths = ["scene.area", "scene.atmosphere", "scene.location", "scene.mood", "scene.surfaceCondition", "lighting.setup", "lighting.source", "lighting.whiteBalance"] as const;
    const hasCompleteBaseline = requiredPaths.every((path) => state.trace.entries.some((entry) => entry.path === path));
    const environment = hasCompleteBaseline
      ? createEnvironmentContent(state.values, german)
      : german ? BASELINE_ENVIRONMENT_DE : BASELINE_ENVIRONMENT_EN;
    const naturalDetails = hasCompleteBaseline
      ? createNaturalDetails(state.values, german)
      : german ? BASELINE_NATURAL_DETAILS_DE : BASELINE_NATURAL_DETAILS_EN;
    const coordination = hasCompleteBaseline ? createLightingCoordination(state.values) : BASELINE_COORDINATION_DE;
    const capture = hasCompleteBaseline ? createLightingCapture(state.values, german) : german ? BASELINE_CAPTURE_DE : BASELINE_CAPTURE_EN;
    const whiteBalance = hasCompleteBaseline ? createWhiteBalance(state.values, german) : german ? BASELINE_WHITE_BALANCE_DE : BASELINE_WHITE_BALANCE_EN;
    const naturalDetailPaths = isOvercastBeachContext(state.values)
      ? ["scene.area", "scene.location"] as const
      : ["scene.atmosphere"] as const;
    const compact = hasCompleteBaseline ? createCompactSceneLight(state.values, german) : undefined;
    const compactLocation = hasCompleteBaseline && german ? createCompactLocation(state.values) : undefined;
    const fragments = !hasCompleteBaseline ? undefined : german ? [
      createResolvedFragmentDraft(state, "scene-lighting", "scene.environment", environment, ["scene.area", "scene.atmosphere", "scene.location", "scene.mood", "scene.surfaceCondition"]),
      createResolvedFragmentDraft(state, "scene-lighting", "scene.natural-details", naturalDetails, naturalDetailPaths),
      createResolvedFragmentDraft(state, "scene-lighting", "lighting.coordination", coordination, ["lighting.setup", "lighting.source"]),
      createResolvedFragmentDraft(state, "scene-lighting", "scene.surface-details", GENERIC_DETAILS_DE, ["scene.atmosphere"]),
      createResolvedFragmentDraft(state, "scene-lighting", "lighting.capture", capture, ["lighting.setup", "lighting.source"]),
      createResolvedFragmentDraft(state, "scene-lighting", "lighting.white-balance", whiteBalance, ["lighting.whiteBalance"]),
      createResolvedFragmentDraft(state, "scene-lighting", "lighting.source-consistency", SOURCE_CONSISTENCY_DE, ["lighting.setup", "lighting.source"]),
      createResolvedFragmentDraft(state, "scene-lighting", "scene.compact-scene-light", compact!.text, compact!.paths),
      createResolvedFragmentDraft(
        state,
        "scene-lighting",
        "scene.compact-location",
        compactLocation!.text,
        compactLocation!.paths,
      ),
    ] : [
      createResolvedFragmentDraft(state, "scene-lighting", "scene.environment", environment, ["scene.area", "scene.atmosphere", "scene.location", "scene.mood", "scene.surfaceCondition"]),
      createResolvedFragmentDraft(state, "scene-lighting", "scene.natural-details", naturalDetails, naturalDetailPaths),
      createResolvedFragmentDraft(state, "scene-lighting", "lighting.capture", capture, ["lighting.setup", "lighting.source"]),
      createResolvedFragmentDraft(state, "scene-lighting", "lighting.white-balance", whiteBalance, ["lighting.whiteBalance"]),
      createResolvedFragmentDraft(state, "scene-lighting", "lighting.source-consistency", SOURCE_CONSISTENCY_EN, ["lighting.setup", "lighting.source"]),
      createResolvedFragmentDraft(state, "scene-lighting", "scene.compact-scene-light", compact!.text, compact!.paths),
    ];
    const heading = german ? "LOCATION, WETTER & LICHT" : "LOCATION, WEATHER, AND LIGHT";
    const details = hasCompleteBaseline
      ? german
        ? `${naturalDetails} ${coordination} ${GENERIC_DETAILS_DE} ${capture} ${whiteBalance}`
        : `${naturalDetails} ${capture} ${whiteBalance}`
      : german ? BASELINE_DETAILS_DE : BASELINE_DETAILS_EN;
    return [createResolvedSectionDraft(state, "scene-lighting", `${heading}\n${environment} ${details}`, fragments)];
  },
};

function createCompactSceneLight(values: unknown, german: boolean): { readonly text: string; readonly paths: readonly string[] } {
  const scene = objectAt(values, "scene");
  const location = requiredString(scene, "location");
  const area = requiredString(scene, "area");
  if (location === "location.apartment" && area === "locationArea.apartment.modern_living_room_window") {
    return {
      text: german ? COMPACT_APARTMENT_DE : COMPACT_APARTMENT_EN,
      paths: german
        ? ["scene.area", "scene.location", "scene.mood", "scene.surfaceCondition", "lighting.setup", "lighting.source", "lighting.whiteBalance"]
        : ["scene.area", "scene.atmosphere", "scene.location", "scene.surfaceCondition", "lighting.setup", "lighting.source", "lighting.whiteBalance"],
    };
  }
  if (location === "Terrasse" && area === "Terrasse eines Stadthauses · ruhig und privat") {
    return {
      text: german ? COMPACT_TERRACE_DE : COMPACT_TERRACE_EN,
      paths: ["scene.area", "scene.atmosphere", "scene.location", "lighting.setup", "lighting.source", "lighting.whiteBalance"],
    };
  }
  if (location === "Strand" && area === "Bewölkter Strand · diffuse Atmosphäre") {
    return {
      text: german ? COMPACT_BEACH_DE : COMPACT_BEACH_EN,
      paths: ["scene.area", "scene.location", "scene.mood", "scene.surfaceCondition", "lighting.setup", "lighting.source", "lighting.whiteBalance"],
    };
  }
  throw new Error(`Unsupported compact scene context: ${location}, ${area}`);
}

function createCompactLocation(values: unknown): { readonly text: string; readonly paths: readonly string[] } {
  const scene = objectAt(values, "scene");
  const location = requiredString(scene, "location");
  const area = requiredString(scene, "area");
  if (location === "location.apartment" && area === "locationArea.apartment.modern_living_room_window") {
    const lighting = objectAt(values, "lighting");
    if (requiredString(lighting, "source") !== "lightSource.window") throw new Error("Unsupported compact apartment light source");
    return {
      text: "in einer modernen Wohnung, Wohnzimmer · modern, mit natürlichem Fensterlicht",
      paths: ["scene.area", "scene.location", "lighting.source"],
    };
  }
  if (location === "Strand" && area === "Bewölkter Strand · diffuse Atmosphäre") {
    return {
      text: "an einem Strand, Bewölkter Strand · diffuse Atmosphäre",
      paths: ["scene.area", "scene.location"],
    };
  }
  if (location === "Terrasse" && area === "Terrasse eines Stadthauses · ruhig und privat") {
    return {
      text: "auf einer Terrasse, Terrasse eines Stadthauses · ruhig und privat",
      paths: ["scene.area", "scene.location"],
    };
  }
  throw new Error(`Unsupported compact location: ${location}, ${area}`);
}

function createEnvironmentContent(values: unknown, german: boolean): string {
  const scene = objectAt(values, "scene");
  const location = requiredString(scene, "location");
  const area = requiredString(scene, "area");
  const mood = requiredString(scene, "mood");
  const atmosphere = requiredString(scene, "atmosphere");
  const surfaceCondition = requiredString(scene, "surfaceCondition");
  if (location === "location.apartment" && area === "locationArea.apartment.modern_living_room_window"
    && mood === "mood.calm_authentic" && atmosphere === "atmosphere.subtle_lived_in" && surfaceCondition === "surfaceCondition.dry") {
    return german ? BASELINE_ENVIRONMENT_DE : BASELINE_ENVIRONMENT_EN;
  }
  const locationText = location === "Terrasse" ? (german ? "Terrasse" : "terrace") : location;
  const areaText = area === "Terrasse eines Stadthauses · ruhig und privat"
    ? (german ? "Terrasse eines Stadthauses · ruhig und privat" : "a townhouse terrace that feels quiet and private")
    : area;
  if (mood === "mood.balanced_summery_casual_travel" && atmosphere === "atmosphere.warm_sunny_light_breeze" && surfaceCondition === "surfaceCondition.dry") {
    return german
      ? `auf einer ${locationText}, im Bereich ${areaText}. Die Luft wirkt warm. Die Bildstimmung wirkt ausgeglichen, sommerlich und wie ein ungezwungener Reisemoment. Es ist sonnig, bei leichter Brise und warmer Luft. Die Umgebung ist trocken, ohne Nässe-Effekt.`
      : `The scene is set on a ${locationText}, specifically ${areaText}. The air feels warm. The mood feels balanced, summery, and a casual travel moment. Conditions are sunny, with a light breeze and warm air. The environment is dry, without a wet-look effect.`;
  }
  if (location === "Strand" && area === "Bewölkter Strand · diffuse Atmosphäre"
    && mood === "mood.warm_balanced_travel" && atmosphere === "atmosphere.overcast_calm_clear"
    && surfaceCondition === "surfaceCondition.dry") {
    return german
      ? "an einem Strand, im Bereich Bewölkter Strand · diffuse Atmosphäre. Die Szene wirkt warm und reise-moment. Die Umgebung ist trocken, ohne Nässe-Effekt. Die Bildstimmung wirkt warm, ausgeglichen und reise-Moment. Es ist bewölkt, bei Windstille und klar."
      : "The scene is set on a beach, specifically an overcast beach with a diffuse atmosphere. The mood feels warm, balanced, muted, and like a travel moment. Conditions are overcast, with calm winds and clear air. The environment is dry, without a wet-look effect.";
  }
  throw new Error(`Unsupported resolved scene context: ${mood}, ${atmosphere}, ${surfaceCondition}`);
}

function createNaturalDetails(values: unknown, german: boolean): string {
  const atmosphere = requiredString(objectAt(values, "scene"), "atmosphere");
  if (atmosphere === "atmosphere.subtle_lived_in") return german ? BASELINE_NATURAL_DETAILS_DE : BASELINE_NATURAL_DETAILS_EN;
  if (atmosphere === "atmosphere.warm_sunny_light_breeze") return german ? GENERIC_DETAILS_DE : GENERIC_DETAILS_EN;
  if (atmosphere === "atmosphere.overcast_calm_clear") return german ? OVERCAST_DETAILS_DE : OVERCAST_DETAILS_EN;
  throw new Error(`Unsupported resolved scene.atmosphere: ${atmosphere}`);
}

function createLightingCoordination(values: unknown): string {
  const lighting = objectAt(values, "lighting");
  const source = requiredString(lighting, "source");
  const setup = requiredString(lighting, "setup");
  if ((source === "lightSource.window" || source === "Bewölkter Himmel") && setup === "lighting.soft_side_window") return BASELINE_COORDINATION_DE;
  if (source === "lightSource.direct_sunlight" && setup === "lighting.hard_side_sunlight") return DIRECT_COORDINATION_DE;
  if (source === "Bewölkter Himmel" && setup === "lighting.diffuse_overcast") return OVERCAST_COORDINATION_DE;
  throw new Error(`Unsupported resolved lighting context: ${source}, ${setup}`);
}

function createLightingCapture(values: unknown, german: boolean): string {
  const lighting = objectAt(values, "lighting");
  const source = requiredString(lighting, "source");
  const setup = requiredString(lighting, "setup");
  if ((source === "lightSource.window" || source === "Bewölkter Himmel") && setup === "lighting.soft_side_window") return german ? BASELINE_CAPTURE_DE : BASELINE_CAPTURE_EN;
  if (source === "lightSource.direct_sunlight" && setup === "lighting.hard_side_sunlight") return german ? DIRECT_CAPTURE_DE : DIRECT_CAPTURE_EN;
  if (source === "Bewölkter Himmel" && setup === "lighting.diffuse_overcast") return german ? OVERCAST_CAPTURE_DE : OVERCAST_CAPTURE_EN;
  throw new Error(`Unsupported resolved lighting context: ${source}, ${setup}`);
}

function createWhiteBalance(values: unknown, german: boolean): string {
  const whiteBalance = requiredString(objectAt(values, "lighting"), "whiteBalance");
  if (whiteBalance === "whiteBalance.neutral") return german ? BASELINE_WHITE_BALANCE_DE : BASELINE_WHITE_BALANCE_EN;
  if (whiteBalance === "whiteBalance.late_day_warm") return german ? LATE_DAY_WHITE_BALANCE_DE : LATE_DAY_WHITE_BALANCE_EN;
  throw new Error(`Unsupported resolved lighting.whiteBalance: ${whiteBalance}`);
}

function isOvercastBeachContext(values: unknown): boolean {
  const scene = objectAt(values, "scene");
  return scene?.location === "Strand" && scene.area === "Bewölkter Strand · diffuse Atmosphäre";
}

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[key];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? child as Readonly<Record<string, unknown>>
    : undefined;
}

function requiredString(value: Readonly<Record<string, unknown>> | undefined, key: string): string {
  const candidate = value?.[key];
  if (typeof candidate !== "string" || candidate.length === 0) throw new Error(`Missing resolved scene.${key}`);
  return candidate;
}
