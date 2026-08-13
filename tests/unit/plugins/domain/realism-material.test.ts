import { describe, expect, it } from "vitest";

import { adaptiveRealismProvider } from "../../../../src/plugins/adaptive-realism/rules";
import { materialPhysicsProvider } from "../../../../src/plugins/material-physics/rules";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [materialPhysicsProvider, adaptiveRealismProvider]);

describe("adaptive realism and material physics plugins", () => {
  it("preserves a requested realism reference and derives fabric physics", async () => {
    const state = await resolve({ realism: { reference: "documentary" }, garment: { material: "Denim" } });

    expect(state.values).toEqual({
      realism: { reference: "documentary" },
      material: { fabric: "Denim", physics: "structured natural folds" },
    });
    expect(new Set(state.trace.entries.map((entry) => entry.ruleId))).toEqual(new Set(["adaptive-realism.reference", "material-physics.material", "material-physics.denim-physics"]));
  });
});
