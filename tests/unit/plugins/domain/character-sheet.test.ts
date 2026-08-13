import { describe, expect, it } from "vitest";

import { characterSheetProvider } from "../../../../src/plugins/character-sheet/rules";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [characterSheetProvider]);

describe("character-sheet plugin", () => {
  it("records an adult character-sheet identity from the supplied facts", async () => {
    const state = await resolve({ character: { age: 29, name: "Ada" } });

    expect(state.values).toEqual({ character: { age: 29, name: "Ada", adult: true } });
    expect(new Set(state.trace.entries.map((entry) => entry.ruleId))).toEqual(new Set(["character-sheet.identity", "character-sheet.adult-status"]));
  });
});
