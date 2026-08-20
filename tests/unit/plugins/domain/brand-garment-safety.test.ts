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

  it("projects an explicit upper-garment brand fieldwise with exact sources", async () => {
    const state = await resolve({
      tshirtBrand: "Tommy Hilfiger",
      brandVisibility: "Dezent sichtbar",
      brandPlacement: "Brustbereich / Vorderseite",
    }, [brandProvider]);

    expect(state.values).toEqual({
      brand: {
        allowedGarment: "upper",
        name: "Tommy Hilfiger",
        placement: "Brustbereich / Vorderseite",
        visibility: "Dezent sichtbar",
      },
    });
    expect(state.trace.entries.map(({ path, sourceField }) => ({ path, sourceField }))).toEqual([
      { path: "brand.allowedGarment", sourceField: "tshirtBrand" },
      { path: "brand.name", sourceField: "tshirtBrand" },
      { path: "brand.placement", sourceField: "brandPlacement" },
      { path: "brand.visibility", sourceField: "brandVisibility" },
    ]);
  });

  it("projects branded footwear model and the V500-authoritative material binding", async () => {
    const state = await resolve({
      shoesBrand: "Nike",
      shoesModel: "Air Force 1",
      brandVisibility: "Deutlich sichtbar",
      brandPlacement: "Schuhseite / Zunge",
    }, [brandProvider]);

    expect(state.values).toEqual({
      brand: {
        allowedGarment: "footwear",
        model: "Air Force 1",
        name: "Nike",
        placement: "Schuhseite / Zunge",
        visibility: "Deutlich sichtbar",
      },
      garment: { footwear: { material: "material.smooth_leather" } },
    });
    expect(state.trace.entries.find(({ path }) => path === "garment.footwear.material")).toMatchObject({
      ruleId: "brand.footwear-material-binding",
      sourceFields: ["shoesBrand", "shoesModel"],
    });
  });

  it.each([
    ["Deutsch", "von Tommy Hilfiger", "tshirtBrand"],
    ["English", "by Nike model Air Force 1", "shoesBrand"],
  ])("formulates resolved branding in the garment fragment for %s", async (promptLanguage, expected, sourceField) => {
    const branding = promptLanguage === "Deutsch"
      ? { tshirtBrand: "Tommy Hilfiger", brandVisibility: "Dezent sichtbar", brandPlacement: "Brustbereich / Vorderseite" }
      : { shoesBrand: "Nike", shoesModel: "Air Force 1", brandVisibility: "Deutlich sichtbar", brandPlacement: "Schuhseite / Zunge" };
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      ...branding,
      promptLanguage,
    }, [brandProvider, garmentProvider]);
    const fragments = garmentSection.provide(state)[0]?.fragments ?? [];
    const outfit = fragments.find(({ id }) => id === "garment.outfit");

    expect(outfit?.text).toContain(expected);
    expect(outfit?.traceIds.some((id) => state.trace.entries.find((entry) => entry.id === id)?.sourceField === sourceField)).toBe(true);
    if (promptLanguage === "English") {
      expect(fragments.find(({ id }) => id === "garment.material-behaviour")?.text).toContain("smooth leather");
    }
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

  it("materializes the existing open-garment fragments for the resolved Organza state", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "Deutsch",
      tshirt: "eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur",
      tshirtMaterialMode: "Manuell",
      tshirtMaterial: "Organza",
    }, [garmentProvider, materialPhysicsProvider]);
    const fragments = garmentSection.provide(state)[0]?.fragments ?? [];
    const relevant = fragments.filter(({ id }) => ["garment.state", "garment.upper-body", "garment.layering"].includes(id));

    expect(relevant.map(({ id }) => id)).toEqual(["garment.upper-body", "garment.layering", "garment.state"]);
    expect(relevant.map(({ text }) => text)).toEqual([
      "Das ausgewählte Kleidungsstück „eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur in Weiß aus Organza“ ist das einzige am Oberkörper getragene Kleidungsstück der Hauptperson.",
      "Darunter und darüber befindet sich kein weiteres Oberteil: kein T-Shirt, Tanktop, Camisole, Crop-Top, Body, Unterhemd, Baselayer, Bralette, BH, Pullover, Cardigan, Jacke oder anderes zusätzliches Oberteil. Die offene Trageweise oder leichte Lichtdurchlässigkeit ist keine Erlaubnis, eine Bedeckungs- oder Basisschicht zu ergänzen. Öffnung, Material, Farbe, Passform und Silhouette des ausgewählten Kleidungsstücks unverändert beibehalten.",
      "Das ausgewählte Oberteil wird sichtbar offen getragen. Die ausgewählte vordere Knopfleiste bleibt im sichtbaren Oberkörperbereich eindeutig geöffnet. Kein sichtbarer Knopf verbindet die beiden Vorderteile. Die beiden Vorderteile bleiben entlang der sichtbaren Rumpfmitte getrennt und fallen entsprechend Material, Körperhaltung und Schwerkraft natürlich. Das Oberteil darf weder zugeknöpft, befestigt, überlappend geschlossen noch als geschlossenes Hemd oder geschlossene Bluse interpretiert werden. Öffnung, Material, Farbe, Passform und Silhouette unverändert erhalten. Keine nicht ausgewählte Oberkörper-Schicht ergänzen.",
    ]);
    expect(relevant.map(({ traceIds }) => traceIds)).toEqual([
      [
        "garment.upper.color:garment.upper-color",
        "garment.upper.kind:garment.upper-kind",
        "garment.upper.material:garment.upper-material",
      ],
      [
        "garment.open:garment.open-state",
        "garment.upper.color:garment.upper-color",
        "garment.upper.kind:garment.upper-kind",
        "garment.upper.material:garment.upper-material",
      ],
      [
        "garment.open:garment.open-state",
        "garment.upper.color:garment.upper-color",
        "garment.upper.kind:garment.upper-kind",
        "garment.upper.material:garment.upper-material",
      ],
    ]);
  });

  it("does not materialize open-garment state fragments for the closed baseline", async () => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage: "Deutsch" }, [garmentProvider]);
    const ids = garmentSection.provide(state)[0]?.fragments?.map(({ id }) => id) ?? [];

    expect(ids).not.toContain("garment.state");
    expect(ids).not.toContain("garment.upper-body");
    expect(ids).not.toContain("garment.layering");
  });

  it.each(["Deutsch", "English"])("exposes traced outfit and layering fragments without profile headings in %s", async (promptLanguage) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage }, [garmentProvider]);
    const first = garmentSection.provide(state)[0]!;
    const fragments = first.fragments ?? [];

    expect(garmentSection.provide(state)[0]).toEqual(first);
    expect(fragments.map(({ id }) => id)).toEqual(promptLanguage === "Deutsch"
      ? ["garment.outfit", "garment.compact-selection-restriction", "garment.outfit-build", "garment.material-behaviour"]
      : ["garment.outfit", "garment.compact-selection-restriction", "garment.material-behaviour"]);
    expect(fragments.every(({ text }) => !/^OUTFIT/u.test(text))).toBe(true);
    expect(new Set(fragments.flatMap(({ traceIds }) => traceIds))).toEqual(new Set(
      first.traceIds,
    ));
  });

  it.each([
    [
      "Deutsch",
      "Outfit und Materialien: ein klassisches T-Shirt in Weiß (Baumwolle); eine High-Waist-Jeans in Denimblau (Denim); weiße klassische Sneaker (Leder-Textil-Mischung).",
    ],
    [
      "English",
      "Outfit and materials: a classic T-shirt in white (cotton); high-waisted jeans in denim blue (denim); classic white sneakers (leather-textile blend).",
    ],
  ])("materializes the compact outfit from resolved garment and material values in %s", async (promptLanguage, expected) => {
    const state = await resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage },
      [garmentProvider, materialPhysicsProvider],
    );
    const fragments = garmentSection.provide(state)[0]?.fragments ?? [];
    const compact = fragments.find(({ id }) => id === "garment.compact-outfit");
    const existing = fragments.find(({ id }) => id === "garment.outfit");

    expect(compact?.text).toBe(expected);
    expect(compact?.text).not.toMatch(/EXAKTES OUTFIT|EXACT OUTFIT/u);
    expect(compact?.traceIds).toEqual([
      "garment.footwear.color:garment.footwear-color",
      "garment.footwear.kind:garment.footwear-kind",
      "garment.lower.color:garment.lower-color",
      "garment.lower.kind:garment.lower-kind",
      "garment.upper.color:garment.upper-color",
      "garment.upper.kind:garment.upper-kind",
      "material.footwear:material-physics.footwear-material",
      "material.lower:material-physics.lower-material",
      "material.upper:material-physics.upper-material",
    ]);
    expect(existing?.text).toBe(promptLanguage === "Deutsch"
      ? "Sie trägt ein klassisches T-Shirt in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker."
      : "She wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers.");
  });

  it("materializes a different compact outfit dynamically from the resolved open-garment state", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "English",
      tshirt: "ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur",
      tshirtColor: "Weiß",
      tshirtMaterial: "Voile",
      bra: "kein BH sichtbar / nicht Teil des Outfits",
      sweater: "kein Pullover",
      jacket: "keine Jacke",
      outfitBuild: "Einzelne saubere Schicht",
    }, [garmentProvider, materialPhysicsProvider]);
    const fragments = garmentSection.provide(state)[0]?.fragments ?? [];

    expect(fragments.find(({ id }) => id === "garment.compact-outfit")?.text).toBe(
      "Outfit and materials: an airy voile shirt worn open with a fine woven texture in white (Voile); classic white sneakers (leather-textile blend).",
    );
    expect(fragments.find(({ id }) => id === "garment.outfit")?.text).toBe(
      "She wears an airy voile shirt worn open with a fine woven texture in white and classic white sneakers.",
    );
  });

  it.each([
    ["Deutsch", "Keine nicht ausgewählten Kleidungsstücke oder zusätzlichen Schichten ergänzen."],
    ["English", "Do not add any unselected garment or extra layer."],
  ])("materializes the compact garment selection restriction in %s", async (promptLanguage, expected) => {
    const state = await resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage },
      [garmentProvider, materialPhysicsProvider],
    );
    const fragment = garmentSection.provide(state)[0]?.fragments?.find(
      ({ id }) => id === "garment.compact-selection-restriction",
    );

    expect(fragment?.text).toBe(expected);
    expect(fragment?.traceIds).toEqual(["garment.outfitBuild:garment.outfit-build"]);
    expect(garmentSection.provide(state)[0]?.fragments?.find(({ id }) => id === "garment.outfit")?.text).toBe(
      promptLanguage === "Deutsch"
        ? "Sie trägt ein klassisches T-Shirt in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker."
        : "She wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers.",
    );
  });

  it.each([
    [
      "English",
      {
        tshirt: "ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur",
        tshirtColor: "Weiß",
        tshirtMaterial: "Voile",
        bra: "kein BH sichtbar / nicht Teil des Outfits",
        sweater: "kein Pullover",
        jacket: "keine Jacke",
        outfitBuild: "Einzelne saubere Schicht",
      },
      "The selected garment, an airy voile shirt worn open with a fine woven texture in white, is the primary subject's only upper-body garment. Every front button is visibly undone from collar to lower hem. The two front panels remain visibly separated as an open shirt front along the torso and drape naturally according to the material, posture, and gravity. The shirt must not read as buttoned, fastened, closed, or replaced by another top. No T-shirt, tank top, camisole, crop top, bodysuit, undershirt, base layer, bralette, bra, sweater, cardigan, or other top is worn beneath or over it. Keep the presentation incidental, realistic, and non-sexualized; do not eroticize or visually emphasize the chest area.",
    ],
    [
      "Deutsch",
      {
        tshirt: "eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur",
        tshirtMaterialMode: "Manuell",
        tshirtMaterial: "Organza",
      },
      "Das eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur in Weiß aus Organza ist das einzige Oberkörper-Kleidungsstück der Hauptperson. Alle vorderen Knöpfe sind vom Kragen bis zum unteren Saum sichtbar geöffnet. Die beiden Vorderteile bleiben entlang des Oberkörpers als offene Hemdfront erkennbar und fallen entsprechend Material, Körperhaltung und Schwerkraft natürlich. Das Hemd darf nicht wie zugeknöpft, geschlossen oder durch ein anderes Oberteil ersetzt wirken. Darunter oder darüber befindet sich kein T-Shirt, Tanktop, Camisole, Crop-Top, Body, Unterhemd, Baselayer, Bralette, BH, Pullover, Cardigan oder anderes Oberteil. Die Darstellung bleibt beiläufig, realistisch und nicht sexualisiert; der Brustbereich wird weder hervorgehoben noch erotisiert.",
    ],
  ])("materializes the compact upper-body layer contract for %s", async (promptLanguage, overrides, expected) => {
    const state = await resolve(
      { ...createCanonicalProjectStateV5Values(), ...overrides, promptLanguage },
      [garmentProvider, materialPhysicsProvider],
    );
    const fragment = garmentSection.provide(state)[0]?.fragments?.find(
      ({ id }) => id === "garment.compact-upper-layer-contract",
    );

    expect(fragment?.text).toBe(expected);
    expect(fragment?.traceIds).toEqual([
      "garment.open:garment.open-state",
      "garment.outfitBuild:garment.outfit-build",
      "garment.upper.color:garment.upper-color",
      "garment.upper.kind:garment.upper-kind",
      "material.upper:material-physics.upper-material",
    ]);
    expect(garmentSection.provide(state)[0]?.fragments?.filter(
      ({ id }) => ["garment.state", "garment.upper-body", "garment.layering"].includes(id),
    )).toHaveLength(3);
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
