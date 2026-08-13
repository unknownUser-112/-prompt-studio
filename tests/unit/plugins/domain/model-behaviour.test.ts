import { describe, expect, it } from "vitest";

import { modelBehaviourProvider } from "../../../../src/plugins/model-behaviour/rules";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [modelBehaviourProvider]);

describe("model-behaviour plugin", () => {
  it("records the selected model behaviour without inventing a default", async () => {
    const state = await resolve({ model: { behaviour: "strict-json" } });

    expect(state.values).toEqual({ model: { behaviour: "strict-json" } });
    expect(state.trace.entries[0]).toMatchObject({ ruleId: "model-behaviour.selection" });
  });
});
