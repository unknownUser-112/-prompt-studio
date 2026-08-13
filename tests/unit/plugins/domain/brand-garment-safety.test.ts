import { describe, expect, it } from "vitest";

import { brandProvider } from "../../../../src/plugins/brand/rules";
import { garmentProvider } from "../../../../src/plugins/garment/rules";
import { garmentSection } from "../../../../src/plugins/garment/sections";
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
