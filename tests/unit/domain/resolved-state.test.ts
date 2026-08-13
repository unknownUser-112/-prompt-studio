import { describe, expect, it } from "vitest";

import type { ConstraintProvider } from "../../../src/domain/contracts/constraints/provider";
import { ConstraintEngine } from "../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

describe("ResolvedState", () => {
  it("normalizes facts and deeply freezes the state, values and resolution trace", async () => {
    const provider: ConstraintProvider = {
      id: "subject", sourcePluginId: "subject", version: "1.2.3",
      rules: () => [{
        id: "subject.display-name", version: "1.2.3", sourcePluginId: "subject", phase: "constraints", conflictStrategy: "reject", description: "Uses the normalized subject.",
        evaluate: (context) => [{ path: "subject.displayName", sourceField: "subject.name", value: context.facts.values.subject.name }],
      }],
    };
    const state = await new ConstraintEngine({
      runtime: createFixedRuntime().runtime,
      stateBuilder: createResolvedStateBuilder(),
    }).resolve(
      { subject: { name: "A\r\nB" } }, [provider],
    );

    expect(state.facts.values).toEqual({ subject: { name: "A\nB" } });
    expect(state.values).toEqual({ subject: { displayName: "A\nB" } });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.values)).toBe(true);
    expect(Object.isFrozen(state.values.subject)).toBe(true);
    expect(Object.isFrozen(state.trace.entries)).toBe(true);
  });
});
