import { describe, expect, it } from "vitest";

import { additionalPersonProvider } from "../../../../src/plugins/additional-person/rules";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [additionalPersonProvider]);

describe("additional-person plugin", () => {
  it("keeps the explicit additional-person setting traceable", async () => {
    const state = await resolve({ scene: { additionalPerson: true } });

    expect(state.values).toEqual({ scene: { additionalPerson: true } });
    expect(state.trace.entries[0]).toMatchObject({ ruleId: "additional-person.presence", path: "scene.additionalPerson" });
  });
});
