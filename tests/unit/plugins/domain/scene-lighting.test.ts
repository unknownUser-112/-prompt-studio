import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { ConstraintProvider } from "../../../../src/domain/contracts/constraints/provider";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { PluginManager } from "../../../../src/plugins/plugin-manager";
import { sceneLightingPlugin } from "../../../../src/plugins/scene-lighting/plugin";
import { sceneLightingProvider } from "../../../../src/plugins/scene-lighting/rules";
import { sceneLightingSection } from "../../../../src/plugins/scene-lighting/sections";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";
import { createCanonicalProjectStateV5Values } from "../../../../src/domain/entities/project-factory";

const independentProvider: ConstraintProvider = {
  id: "independent",
  version: "1.0.0",
  sourcePluginId: "independent",
  rules: () => [],
};

const resolve = (input: unknown, reversed = false) => new ConstraintEngine({
  runtime: createFixedRuntime().runtime,
  stateBuilder: createResolvedStateBuilder(),
}).resolve(input, reversed ? [independentProvider, sceneLightingProvider] : [sceneLightingProvider, independentProvider]);

describe("scene-lighting plugin", () => {
  it("projects every supplied scene and lighting fact with stable traces", async () => {
    const input = {
      scene: {
        location: "location.apartment",
        area: "locationArea.apartment.modern_living_room_window",
        mood: "mood.calm_authentic",
        atmosphere: "atmosphere.subtle_lived_in",
        surfaceCondition: "surfaceCondition.dry",
      },
      lighting: {
        source: "lightSource.window",
        setup: "lighting.soft_side_window",
        whiteBalance: "whiteBalance.neutral",
      },
    };

    const state = await resolve(input);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      trace("lighting", "setup"),
      trace("lighting", "source"),
      trace("lighting", "whiteBalance"),
      trace("scene", "area"),
      trace("scene", "atmosphere"),
      trace("scene", "location"),
      trace("scene", "mood"),
      trace("scene", "surfaceCondition"),
    ]);
  });

  it("does not invent missing values and is provider-order independent", async () => {
    const input = { scene: { location: "location.apartment" } };

    const normal = await resolve(input);
    const reversed = await resolve(input, true);

    expect(normal.values).toEqual(input);
    expect(reversed).toEqual(normal);
  });

  it("projects flat location and area field-by-field with exact priority traces", async () => {
    const both = await resolve({
      location: "Terrasse",
      locationArea: "Terrasse eines Stadthauses · ruhig und privat",
      scene: { location: "location.apartment", area: "locationArea.apartment.modern_living_room_window" },
    });
    const locationOnly = await resolve({ location: "Terrasse", scene: { location: "location.apartment", area: "nested-area" } });
    const areaOnly = await resolve({ locationArea: "Terrasse eines Stadthauses · ruhig und privat", scene: { location: "nested-location", area: "nested-area" } });

    expect(both.values).toMatchObject({ scene: { location: "Terrasse", area: "Terrasse eines Stadthauses · ruhig und privat" } });
    expect(both.trace.entries.filter(({ path }) => path === "scene.location")).toHaveLength(1);
    expect(both.trace.entries.filter(({ path }) => path === "scene.area")).toHaveLength(1);
    expect(both.trace.entries).toContainEqual(expect.objectContaining({
      id: "scene.location:scene-lighting.scene-location",
      sourceField: "location",
    }));
    expect(both.trace.entries).toContainEqual(expect.objectContaining({
      id: "scene.area:scene-lighting.scene-area",
      sourceField: "locationArea",
    }));
    expect(locationOnly.values).toEqual({ scene: { location: "Terrasse", area: "nested-area" } });
    expect(locationOnly.trace.entries.find(({ path }) => path === "scene.area")?.sourceField).toBe("scene.area");
    expect(areaOnly.values).toEqual({ scene: { location: "nested-location", area: "Terrasse eines Stadthauses · ruhig und privat" } });
    expect(areaOnly.trace.entries.find(({ path }) => path === "scene.location")?.sourceField).toBe("scene.location");
    expect(await resolve({ location: "Terrasse", locationArea: "Terrasse eines Stadthauses · ruhig und privat" }, true))
      .toEqual(await resolve({ location: "Terrasse", locationArea: "Terrasse eines Stadthauses · ruhig und privat" }));
  });

  it("binds the exact townhouse-terrace context with deterministic multi-source traces", async () => {
    const input = {
      ...createCanonicalProjectStateV5Values(),
      location: "Terrasse",
      locationArea: "Terrasse eines Stadthauses · ruhig und privat",
    };
    const first = await resolve(input);
    const second = await resolve(input, true);

    expect(first.values).toMatchObject({
      scene: {
        mood: "mood.balanced_summery_casual_travel",
        atmosphere: "atmosphere.warm_sunny_light_breeze",
      },
      lighting: {
        source: "lightSource.direct_sunlight",
        setup: "lighting.hard_side_sunlight",
      },
    });
    for (const path of ["scene.mood", "scene.atmosphere", "lighting.source", "lighting.setup"]) {
      const traces = first.trace.entries.filter((entry) => entry.path === path);
      expect(traces).toHaveLength(1);
      expect(traces[0]).toMatchObject({
        id: `${path}:scene-lighting.${path.replace(".", "-").replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`)}`,
        sourceFields: ["location", "locationArea"],
      });
    }
    expect(second).toEqual(first);
  });

  it("does not derive the townhouse-terrace context from a partial location", async () => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), location: "Terrasse" });

    expect(state.values).toMatchObject({
      scene: { mood: "mood.calm_authentic", atmosphere: "atmosphere.subtle_lived_in" },
      lighting: { source: "lightSource.window", setup: "lighting.soft_side_window" },
    });
    expect(state.trace.entries.find(({ path }) => path === "scene.mood")?.sourceField).toBe("scene.mood");
  });

  it("resolves the exact manual overcast beach context with field-level provenance", async () => {
    const input = {
      ...createCanonicalProjectStateV5Values(),
      location: "Strand",
      locationArea: "Bewölkter Strand · diffuse Atmosphäre",
      weatherMode: "Manuell",
      lightMode: "Erweitert",
      primaryLight: "Direkte Sonne",
      featureSelections: {
        weather: { condition: { enabled: true, intensity: "Bewölkt" } },
      },
    };

    const state = await resolve(input);

    expect(state.values).toMatchObject({
      scene: {
        location: "Strand",
        area: "Bewölkter Strand · diffuse Atmosphäre",
        mood: "mood.warm_balanced_travel",
        atmosphere: "atmosphere.overcast_calm_clear",
        surfaceCondition: "surfaceCondition.dry",
      },
      lighting: {
        source: "Bewölkter Himmel",
        setup: "lighting.diffuse_overcast",
        whiteBalance: "whiteBalance.late_day_warm",
      },
    });
    expect(state.trace.entries.find(({ path }) => path === "scene.mood")?.sourceFields).toEqual(["location", "locationArea"]);
    expect(state.trace.entries.find(({ path }) => path === "scene.atmosphere")?.sourceFields).toEqual([
      "featureSelections.weather.condition.enabled",
      "featureSelections.weather.condition.intensity",
      "weatherMode",
    ]);
    expect(state.trace.entries.find(({ path }) => path === "lighting.source")?.sourceFields).toEqual([
      "featureSelections.weather.condition.enabled",
      "featureSelections.weather.condition.intensity",
      "lightMode",
      "primaryLight",
      "weatherMode",
    ]);
    expect(state.trace.entries.find(({ path }) => path === "lighting.setup")?.sourceFields).toEqual([
      "featureSelections.weather.condition.enabled",
      "featureSelections.weather.condition.intensity",
      "lightMode",
      "primaryLight",
      "weatherMode",
    ]);
    expect(state.trace.entries.find(({ path }) => path === "lighting.whiteBalance")?.sourceField).toBe("primaryLight");
  });

  it("formulates the resolved manual overcast beach context byte-identically", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "Deutsch",
      location: "Strand",
      locationArea: "Bewölkter Strand · diffuse Atmosphäre",
      weatherMode: "Manuell",
      lightMode: "Erweitert",
      primaryLight: "Direkte Sonne",
      featureSelections: {
        weather: { condition: { enabled: true, intensity: "Bewölkt" } },
      },
    });

    expect(sceneLightingSection.provide(state)[0]?.text).toBe(
      "LOCATION, WETTER & LICHT\n"
      + "an einem Strand, im Bereich Bewölkter Strand · diffuse Atmosphäre. Die Szene wirkt warm und reise-moment. Die Umgebung ist trocken, ohne Nässe-Effekt. Die Bildstimmung wirkt warm, ausgeglichen und reise-Moment. Es ist bewölkt, bei Windstille und klar. "
      + "unregelmäßige Fußspuren im Sand. kleine vom Wind geformte Sandstrukturen. natürlich verteilte Stranddetails. leichte Bewegung durch die Brise. "
      + "Bewölkter Himmel bestimmt gemeinsam die Richtung von Haut-Highlights, Stoffreflexionen, Haarlicht und Schlagschatten. weiche Übergänge besitzen breite Halbschatten und keine widersprüchlichen harten Zweitschatten. "
      + "kleine nicht-periodische Unregelmäßigkeiten statt wiederholter Muster. dezente Gebrauchsspuren nur dort, wo Material und Nutzung sie plausibel machen. Hintergrundobjekte besitzen konsistente Maßstäbe, Fluchtlinien und gegenseitige Verdeckung. "
      + "Diffuses Tageslicht fällt diffus von oben ein, wirkt sehr weich und erzeugt sehr weiche Schatten bei geringem Kontrast. leicht warme Farbtemperatur wie spätes Tageslicht.",
    );
  });

  it("registers through the existing plugin contract without domain-plugin imports or section rules", async () => {
    const manager = new PluginManager();
    manager.load([sceneLightingPlugin]);
    const source = ["plugin.ts", "rules.ts", "sections.ts"]
      .map((file) => readFileSync(`src/plugins/scene-lighting/${file}`, "utf8"))
      .join("\n");
    const state = await resolve({ scene: { location: "location.apartment" } });
    const drafts = sceneLightingSection.provide(state);

    expect(manager.pluginStatus("scene-lighting")).toBe("active");
    expect(manager.constraintProviders).toEqual([sceneLightingProvider]);
    expect(source).not.toMatch(/from ["']\.\.\/(?!\.)/u);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.traceIds).toEqual(state.trace.entries.map((entry) => entry.id));
  });

  it("is included in the central bootstrap plugin registration", () => {
    const bootstrap = readFileSync("src/bootstrap/index.ts", "utf8");

    expect(bootstrap).toContain('import { sceneLightingPlugin } from "../plugins/scene-lighting/plugin"');
    expect(bootstrap).toContain("sceneLightingPlugin");
    expect(bootstrap).toMatch(/plugins\.load\(\[[\s\S]*sceneLightingPlugin[\s\S]*\]\)/u);
  });

  it.each(["Deutsch", "English"])("exposes deterministic scene-detail and lighting fragments in %s", async (promptLanguage) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = sceneLightingSection.provide(state)[0]!;
    const fragments = first.fragments ?? [];

    expect(sceneLightingSection.provide(state)[0]).toEqual(first);
    expect(fragments.map(({ id }) => id)).toEqual(promptLanguage === "Deutsch"
      ? ["scene.environment", "scene.natural-details", "lighting.coordination", "scene.surface-details", "lighting.capture", "lighting.white-balance", "lighting.source-consistency", "scene.compact-scene-light", "scene.compact-location"]
      : ["scene.environment", "scene.natural-details", "lighting.capture", "lighting.white-balance", "lighting.source-consistency", "scene.compact-scene-light"]);
    expect(fragments.every(({ text }) => !/^(LOCATION|SZENE)/u.test(text))).toBe(true);
    expect(fragments.every(({ traceIds }) => traceIds.length > 0)).toBe(true);
  });

  it("materializes the compact German location with exact provenance", async () => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage: "Deutsch" });
    const first = sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "scene.compact-location");
    const second = sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "scene.compact-location");

    expect(first?.text).toBe("in einer modernen Wohnung, Wohnzimmer · modern, mit natürlichem Fensterlicht");
    expect(first?.traceIds).toEqual([
      "lighting.source:scene-lighting.lighting-source",
      "scene.area:scene-lighting.scene-area",
      "scene.location:scene-lighting.scene-location",
    ]);
    expect(second).toEqual(first);
  });

  it.each([
    ["Deutsch", "Schatten, Reflexionen und Haut-Highlights folgen einer klaren, physikalisch glaubwürdigen Lichtquelle."],
    ["English", "Shadows, reflections, and skin highlights must follow one clear, physically plausible light source."],
  ])("exposes exact resolved lighting-source consistency in %s", async (promptLanguage, expectedText) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "lighting.source-consistency");
    const second = sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "lighting.source-consistency");

    expect(first).toEqual(second);
    expect(first?.text).toBe(expectedText);
    expect(first?.text.trim()).not.toBe("");
    expect(first?.text).not.toContain("LOCATION AND LIGHT");
    expect(first?.traceIds).toEqual([
      "lighting.setup:scene-lighting.lighting-setup",
      "lighting.source:scene-lighting.lighting-source",
    ]);
  });

  it.each([
    ["English", "The scene is set on a terrace, specifically a townhouse terrace that feels quiet and private."],
    ["Deutsch", "auf einer Terrasse, im Bereich Terrasse eines Stadthauses · ruhig und privat."],
  ])("formulates the terrace location only from resolved scene values in %s", async (promptLanguage, expectedStart) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
      location: "Terrasse",
      locationArea: "Terrasse eines Stadthauses · ruhig und privat",
    });
    const fragment = sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "scene.environment");

    expect(state.values).toHaveProperty("scene.location", "Terrasse");
    expect(state.values).toHaveProperty("scene.area", "Terrasse eines Stadthauses · ruhig und privat");
    expect(fragment?.text.startsWith(expectedStart)).toBe(true);
    expect(fragment?.traceIds).toEqual([
      "scene.area:scene-lighting.scene-area",
      "scene.atmosphere:scene-lighting.scene-atmosphere",
      "scene.location:scene-lighting.scene-location",
      "scene.mood:scene-lighting.scene-mood",
      "scene.surfaceCondition:scene-lighting.scene-surface-condition",
    ]);
  });

  it.each([
    [
      "English",
      "The scene is set on a terrace, specifically a townhouse terrace that feels quiet and private. The air feels warm. The mood feels balanced, summery, and a casual travel moment. Conditions are sunny, with a light breeze and warm air. The environment is dry, without a wet-look effect.",
      "Direct sunlight enters from the side, appears hard, and creates clearly defined shadows with pronounced contrast.",
    ],
    [
      "Deutsch",
      "auf einer Terrasse, im Bereich Terrasse eines Stadthauses · ruhig und privat. Die Luft wirkt warm. Die Bildstimmung wirkt ausgeglichen, sommerlich und wie ein ungezwungener Reisemoment. Es ist sonnig, bei leichter Brise und warmer Luft. Die Umgebung ist trocken, ohne Nässe-Effekt.",
      "Direktes Sonnenlicht fällt seitlich ein, wirkt hart und erzeugt klar definierte Schatten mit ausgeprägtem Kontrast.",
    ],
  ])("formulates the resolved terrace context and lighting in %s", async (promptLanguage, expectedEnvironment, expectedLighting) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
      location: "Terrasse",
      locationArea: "Terrasse eines Stadthauses · ruhig und privat",
    });
    const fragments = sceneLightingSection.provide(state)[0]?.fragments ?? [];

    expect(fragments.find(({ id }) => id === "scene.environment")?.text).toBe(expectedEnvironment);
    expect(fragments.find(({ id }) => id === "lighting.capture")?.text).toBe(expectedLighting);
    expect(fragments.find(({ id }) => id === "lighting.capture")?.traceIds).toEqual([
      "lighting.setup:scene-lighting.lighting-setup",
      "lighting.source:scene-lighting.lighting-source",
    ]);
  });

  it("keeps camera-owned lighting-source provenance in the lighting fragment", async () => {
    const baseline = createCanonicalProjectStateV5Values();
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
      {
        ...baseline,
        promptLanguage: "English",
        lighting: { setup: baseline.lighting.setup, whiteBalance: baseline.lighting.whiteBalance, weather: "Bewölkt" },
      },
      [sceneLightingProvider, (await import("../../../../src/plugins/camera/rules")).cameraProvider],
    );
    const sourceTrace = state.trace.entries.find(({ path }) => path === "lighting.source")!;
    const capture = sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "lighting.capture");
    const sourceConsistency = sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "lighting.source-consistency");

    expect(sourceTrace.sourcePluginId).toBe("camera");
    expect(capture?.traceIds).toContain(sourceTrace.id);
    expect(new Set(capture?.traceIds)).toEqual(new Set([
      sourceTrace.id,
      state.trace.entries.find(({ path }) => path === "lighting.setup")!.id,
    ]));
    expect(sourceConsistency?.traceIds).toEqual([
      state.trace.entries.find(({ path }) => path === "lighting.setup")!.id,
      sourceTrace.id,
    ]);
  });

  it.each([
    [
      "English",
      {},
      "Scene in an apartment, specifically modern living room with natural window light. Conditions are dry and mild. Window light enters from the side, appears soft, and creates softly defined shadows with low contrast. A neutral white balance with natural skin tones.",
    ],
    [
      "Deutsch",
      {},
      "in einer modernen Wohnung, im Bereich Wohnzimmer · modern, mit natürlichem Fenster. Die Szene wirkt ruhig und alltäglich. Die Umgebung ist trocken, ohne Nässe-Effekt. Fensterlicht fällt seitlich ein, wirkt weich und erzeugt weich definierte Schatten bei geringem Kontrast. neutraler Weißabgleich mit natürlichen Hautfarben.",
    ],
    [
      "English",
      { location: "Terrasse", locationArea: "Terrasse eines Stadthauses · ruhig und privat" },
      "Scene on a terrace, specifically townhouse terrace that feels quiet and private. Conditions are sunny. Direct sunlight enters from the side, appears hard, and creates clearly defined shadows with pronounced contrast. A neutral white balance with natural skin tones.",
    ],
  ])("materializes the compact scene-and-light fragment in %s", async (promptLanguage, override, expected) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage, ...override });
    const fragments = sceneLightingSection.provide(state)[0]?.fragments ?? [];
    const compact = fragments.find(({ id }) => id === "scene.compact-scene-light");

    expect(compact?.text).toBe(expected);
    expect(compact?.traceIds.length).toBeGreaterThan(0);
    expect(compact?.traceIds.every((id) => /^(scene|lighting)\./u.test(id))).toBe(true);
    expect(sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "scene.environment")?.text).toBeTruthy();
  });

  it("materializes the compact overcast beach from the resolved context with exact provenance", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "Deutsch",
      location: "Strand",
      locationArea: "Bewölkter Strand · diffuse Atmosphäre",
      weatherMode: "Manuell",
      lightMode: "Erweitert",
      primaryLight: "Direkte Sonne",
      featureSelections: { weather: { condition: { enabled: true, intensity: "Bewölkt" } } },
    });
    const compact = sceneLightingSection.provide(state)[0]?.fragments?.find(({ id }) => id === "scene.compact-scene-light");

    expect(compact?.text).toBe(
      "an einem Strand, im Bereich Bewölkter Strand · diffuse Atmosphäre. Die Szene wirkt warm und reise-moment. Die Umgebung ist trocken, ohne Nässe-Effekt. Diffuses Tageslicht fällt diffus von oben ein, wirkt sehr weich und erzeugt sehr weiche Schatten bei geringem Kontrast. leicht warme Farbtemperatur wie spätes Tageslicht.",
    );
    expect(compact?.traceIds).toEqual([
      "lighting.setup:scene-lighting.lighting-setup",
      "lighting.source:scene-lighting.lighting-source",
      "lighting.whiteBalance:scene-lighting.lighting-white-balance",
      "scene.area:scene-lighting.scene-area",
      "scene.location:scene-lighting.scene-location",
      "scene.mood:scene-lighting.scene-mood",
      "scene.surfaceCondition:scene-lighting.scene-surface-condition",
    ]);
  });
});

function trace(domain: "scene" | "lighting", field: string) {
  const ruleField = field.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
  return {
    id: `${domain}.${field}:scene-lighting.${domain}-${ruleField}`,
    path: `${domain}.${field}`,
    ruleId: `scene-lighting.${domain}-${ruleField}`,
    sourceField: `${domain}.${field}`,
  };
}
