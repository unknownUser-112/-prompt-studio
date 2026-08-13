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
      ? ["scene.environment", "scene.natural-details", "lighting.coordination", "scene.surface-details", "lighting.capture", "lighting.white-balance"]
      : ["scene.environment", "scene.natural-details", "lighting.capture", "lighting.white-balance"]);
    expect(fragments.every(({ text }) => !/^(LOCATION|SZENE)/u.test(text))).toBe(true);
    expect(fragments.every(({ traceIds }) => traceIds.length > 0)).toBe(true);
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

    expect(sourceTrace.sourcePluginId).toBe("camera");
    expect(capture?.traceIds).toContain(sourceTrace.id);
    expect(new Set(capture?.traceIds)).toEqual(new Set([
      sourceTrace.id,
      state.trace.entries.find(({ path }) => path === "lighting.setup")!.id,
    ]));
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
