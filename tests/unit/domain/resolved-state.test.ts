import { describe, expect, it } from "vitest";

import type { ConstraintProvider } from "../../../src/domain/contracts/constraints/provider";
import type { ResolvedStateAssignment } from "../../../src/domain/contracts/resolved-state/resolved-state";
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

  it("transports canonical multi-source metadata without changing single-source trace identity", async () => {
    const provider: ConstraintProvider = {
      id: "sources", sourcePluginId: "sources", version: "1.0.0",
      rules: () => [
        {
          id: "sources.single", version: "1.0.0", sourcePluginId: "sources", phase: "facts", conflictStrategy: "reject", description: "Single source.",
          evaluate: () => [{ path: "result.single", sourceField: "subject.name", value: "Ada" }],
        },
        {
          id: "sources.multi", version: "1.0.0", sourcePluginId: "sources", phase: "constraints", conflictStrategy: "reject", description: "Multiple sources.",
          evaluate: () => [{ path: "result.multi", sourceFields: ["subject.pose", "subject.name"], value: "Ada standing" }],
        },
      ],
    };
    const state = await new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() })
      .resolve({ subject: { name: "Ada", pose: "standing" } }, [provider]);

    expect(state.trace.entries[0]).toMatchObject({
      id: "result.multi:sources.multi",
      sourceFields: ["subject.name", "subject.pose"],
    });
    expect(state.trace.entries[1]).toMatchObject({
      id: "result.single:sources.single",
      sourceField: "subject.name",
    });
    expect(Object.isFrozen(state.trace.entries[0])).toBe(true);
    expect(Object.isFrozen((state.trace.entries[0] as { readonly sourceFields: readonly string[] }).sourceFields)).toBe(true);
  });

  it("defines mutually exclusive single- and multi-source resolved assignments", () => {
    const rule = {
      id: "contract", version: "1.0.0", sourcePluginId: "contract", phase: "constraints", conflictStrategy: "reject", description: "Contract.", evaluate: () => [],
    } as const;
    const single = { path: "result.single", sourceField: "subject.name", value: "Ada", rule } satisfies ResolvedStateAssignment;
    const multi = { path: "result.multi", sourceFields: ["subject.name", "subject.pose"], value: "Ada standing", rule } satisfies ResolvedStateAssignment;

    expect(single.sourceField).toBe("subject.name");
    expect(multi.sourceFields).toEqual(["subject.name", "subject.pose"]);

    // @ts-expect-error A resolved assignment cannot declare both source forms.
    const both: ResolvedStateAssignment = { path: "result.both", sourceField: "subject.name", sourceFields: ["subject.name", "subject.pose"], value: "x", rule };
    // @ts-expect-error A multi-source assignment requires at least two source paths.
    const one: ResolvedStateAssignment = { path: "result.one", sourceFields: ["subject.name"], value: "x", rule };
    // @ts-expect-error A multi-source assignment cannot use an empty source list.
    const empty: ResolvedStateAssignment = { path: "result.empty", sourceFields: [], value: "x", rule };
    expect([both, one, empty]).toHaveLength(3);
  });
});
