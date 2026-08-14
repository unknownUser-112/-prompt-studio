import { describe, expect, it } from "vitest";

import { brandProvider } from "../../../../src/plugins/brand/rules";
import { garmentProvider } from "../../../../src/plugins/garment/rules";
import { garmentSection } from "../../../../src/plugins/garment/sections";
import { materialPhysicsProvider } from "../../../../src/plugins/material-physics/rules";
import { safetyProvider } from "../../../../src/plugins/safety/rules";
import type { ConstraintProvider } from "../../../../src/domain/contracts/constraints/provider";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";
import { createCanonicalProjectStateV5Values } from "../../../../src/domain/entities/project-factory";

const resolve = (input: unknown, providers: readonly ConstraintProvider[]) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, providers);

describe("brand, garment and safety plugins", () => {
  it("binds visible branding to its garment and requires an upper layer for an open garment", async () => {
    const state = await resolve(
      {
        character: { age: 29 },
        garment: { outer: "open cardigan", upperLayer: "tank top", brand: "Northstar" },
      },
      [safetyProvider, garmentProvider, brandProvider],
    );

    expect(state.values).toEqual({
      garment: { outer: "open cardigan", upperLayer: "tank top", open: true },
      brand: { name: "Northstar", allowedGarment: "outer" },
      safety: { adult: true },
    });
  });

  it("blocks an open garment without the required upper layer", async () => {
    await expect(resolve({ garment: { outer: "open cardigan" } }, [garmentProvider])).rejects.toThrow(
      "Open garment requires an upper layer",
    );
  });

  it("projects canonical garment facts with stable rule and source traces", async () => {
    const input = {
      garment: {
        upper: { kind: "upperGarment.classic_tshirt", color: "color.white" },
        lower: { kind: "lowerGarment.high_waist_jeans", color: "color.denim_blue" },
        footwear: { kind: "footwear.classic_sneakers", color: "color.white" },
        outfitBuild: "outfitBuild.single_clean_layer",
      },
    };

    const state = await resolve(input, [garmentProvider]);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      trace("footwear.color"),
      trace("footwear.kind"),
      trace("lower.color"),
      trace("lower.kind"),
      trace("outfitBuild"),
      trace("upper.color"),
      trace("upper.kind"),
    ]);
  });

  it("does not invent absent garment facts and resolves deterministically", async () => {
    const input = { garment: { upper: { kind: "upperGarment.classic_tshirt" } } };

    const first = await resolve(input, [garmentProvider]);
    const second = await resolve(input, [brandProvider, garmentProvider]);

    expect(first.values).toEqual(input);
    expect(second).toEqual(first);
  });

  it("resolves the explicit open-shirt facts over the canonical baseline without competing assignments", async () => {
    const input = {
      ...createCanonicalProjectStateV5Values(),
      tshirt: "ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur",
      tshirtColor: "Weiß",
      tshirtMaterial: "Voile",
      bra: "kein BH sichtbar / nicht Teil des Outfits",
      sweater: "kein Pullover",
      jacket: "keine Jacke",
      outfitBuild: "Einzelne saubere Schicht",
    };

    const state = await resolve(input, [garmentProvider]);

    expect(state.values).toMatchObject({
      garment: {
        upper: { kind: "upperGarment.shirt", color: "color.white", material: "Voile" },
        open: true,
        upperLayer: "none",
        outfitBuild: "outfitBuild.single_clean_layer",
      },
    });
    expect(state.trace.entries.filter(({ path }) => [
      "garment.upper.kind",
      "garment.upper.color",
      "garment.upper.material",
      "garment.open",
      "garment.upperLayer",
      "garment.outfitBuild",
    ].includes(path)).map(({ path, ruleId, sourceField, sourceFields }) => ({ path, ruleId, sourceField, sourceFields }))).toEqual([
      { path: "garment.open", ruleId: "garment.open-state", sourceField: "tshirt", sourceFields: undefined },
      { path: "garment.outfitBuild", ruleId: "garment.outfit-build", sourceField: "outfitBuild", sourceFields: undefined },
      { path: "garment.upper.color", ruleId: "garment.upper-color", sourceField: "tshirtColor", sourceFields: undefined },
      { path: "garment.upper.kind", ruleId: "garment.upper-kind", sourceField: "tshirt", sourceFields: undefined },
      { path: "garment.upper.material", ruleId: "garment.upper-material", sourceField: "tshirtMaterial", sourceFields: undefined },
      { path: "garment.upperLayer", ruleId: "garment.upper-layer", sourceField: undefined, sourceFields: ["bra", "jacket", "sweater"] },
    ]);
    expect(new Set(state.trace.entries.map(({ path }) => path)).size).toBe(state.trace.entries.length);
  });

  it("does not synthesize open-state or layer-presence without their explicit facts", async () => {
    const state = await resolve({ tshirtColor: "Weiß" }, [garmentProvider]);

    expect(state.values).toEqual({ garment: { upper: { color: "color.white" } } });
    expect(state.trace.entries.map(({ path }) => path)).toEqual(["garment.upper.color"]);
  });

  it("projects the explicit wide-leg linen trousers over the nested lower-garment baseline", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      pants: "eine weite Leinenhose",
      pantsMaterialMode: "Manuell",
      pantsMaterial: "Leinen",
    }, [garmentProvider]);

    expect(state.values).toHaveProperty("garment.lower.kind", "lowerGarment.wide_leg_trousers");
    expect(state.values).toHaveProperty("garment.lower.material", "material.linen");
    expect(state.trace.entries.find(({ path }) => path === "garment.lower.kind")).toMatchObject({
      ruleId: "garment.lower-kind",
      sourceField: "pants",
    });
    expect(state.trace.entries.find(({ path }) => path === "garment.lower.material")).toMatchObject({
      ruleId: "garment.lower-material",
      sourceFields: ["pantsMaterial", "pantsMaterialMode"],
    });
  });

  it.each(["Deutsch", "English"])("exposes exact open-garment fragments without profile framing in %s", async (promptLanguage) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
      tshirt: "ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur",
      tshirtColor: "Weiß",
      tshirtMaterial: "Voile",
      bra: "kein BH sichtbar / nicht Teil des Outfits",
      sweater: "kein Pullover",
      jacket: "keine Jacke",
      outfitBuild: "Einzelne saubere Schicht",
    }, [garmentProvider]);
    const draft = garmentSection.provide(state)[0]!;
    const fragments = draft.fragments ?? [];

    expect(fragments.map(({ id }) => id)).toContain("garment.upper-body");
    expect(fragments.map(({ id }) => id)).toContain("garment.layering");
    expect(fragments.map(({ id }) => id)).toContain("garment.state");
    expect(fragments.find(({ id }) => id === "garment.upper-body")?.text).toMatch(promptLanguage === "Deutsch" ? /weiß/iu : /white/iu);
    expect(fragments.find(({ id }) => id === "garment.upper-body")?.text).toMatch(/voile/iu);
    expect(fragments.find(({ id }) => id === "garment.state")?.text).toContain(promptLanguage === "Deutsch" ? "offen" : "worn open");
    expect(fragments.find(({ id }) => id === "garment.layering")?.text).toMatch(promptLanguage === "Deutsch" ? /kein separates Oberkörperkleidungsstück/iu : /No separate upper-body garment/iu);
    expect(fragments.filter(({ id }) => ["garment.upper-body", "garment.layering", "garment.state"].includes(id)).every(({ text, traceIds }) => text.trim().length > 0 && traceIds.length > 0)).toBe(true);
  });

  it.each(["Deutsch", "English"])("exposes traced outfit and layering fragments without profile headings in %s", async (promptLanguage) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage }, [garmentProvider]);
    const first = garmentSection.provide(state)[0]!;
    const fragments = first.fragments ?? [];

    expect(garmentSection.provide(state)[0]).toEqual(first);
    expect(fragments.map(({ id }) => id)).toEqual(promptLanguage === "Deutsch"
      ? ["garment.outfit", "garment.outfit-build", "garment.material-behaviour"]
      : ["garment.outfit", "garment.material-behaviour"]);
    expect(fragments.every(({ text }) => !/^OUTFIT/u.test(text))).toBe(true);
    expect(new Set(fragments.flatMap(({ traceIds }) => traceIds))).toEqual(new Set(
      promptLanguage === "Deutsch"
        ? first.traceIds
        : first.traceIds.filter((id) => !id.startsWith("garment.outfitBuild:")),
    ));
  });

  it.each([
    ["Deutsch", "Materialreflexionen, Falten, Nähte und Materialdicke folgen der Körperhaltung und der Schwerkraft."],
    ["English", "Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind."],
  ])("exposes exact material consistency from active resolved materials in %s", async (promptLanguage, expected) => {
    const state = await resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage },
      [garmentProvider, materialPhysicsProvider],
    );
    const first = garmentSection.provide(state)[0]!;
    const second = garmentSection.provide(state)[0]!;
    const fragment = first.fragments?.find(({ id }) => id === "garment.material-consistency");

    expect(first).toEqual(second);
    expect(fragment?.text).toBe(expected);
    expect(fragment?.text.trim().length).toBeGreaterThan(0);
    expect(fragment?.text).not.toContain("OUTFIT AND MATERIALS");
    expect(fragment?.traceIds).toEqual([
      "material.activeSlots:material-physics.active-material-slots",
      "material.lower:material-physics.lower-material",
      "material.upper:material-physics.upper-material",
    ]);
  });
});

function trace(path: string) {
  const rulePath = path === "outfitBuild" ? "outfit-build" : path.replace(".", "-");
  return {
    id: `garment.${path}:garment.${rulePath}`,
    path: `garment.${path}`,
    ruleId: `garment.${rulePath}`,
    sourceField: `garment.${path}`,
  };
}
