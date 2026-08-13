import { describe, expect, it } from "vitest";

import { brandProvider } from "../../../../src/plugins/brand/rules";
import { garmentProvider } from "../../../../src/plugins/garment/rules";
import { safetyProvider } from "../../../../src/plugins/safety/rules";
import type { ConstraintProvider } from "../../../../src/domain/contracts/constraints/provider";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";

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
});
