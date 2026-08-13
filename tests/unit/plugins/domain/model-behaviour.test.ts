import { describe, expect, it } from "vitest";

import { modelBehaviourProvider } from "../../../../src/plugins/model-behaviour/rules";
import { modelBehaviourSection } from "../../../../src/plugins/model-behaviour/sections";
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

  it.each(["Deutsch", "English"])("exposes profile-agnostic style and restriction fragments in %s", async (promptLanguage) => {
    const state = await resolve({ promptLanguage, model: { behaviour: "style.authentic_lifestyle" } });
    const first = modelBehaviourSection.provide(state)[0]!;
    const second = modelBehaviourSection.provide(state)[0]!;

    expect(first).toEqual(second);
    expect(first.fragments?.map(({ id }) => id)).toEqual(promptLanguage === "Deutsch"
      ? [
        "style.general",
        "style.capture-character",
        "realism.body-mechanics",
        "realism.hair-details",
        "realism.spatial-material-light",
        "restrictions.capture-quality",
        "restrictions.branding",
      ]
      : ["style.general", "realism.spatial-material-light", "restrictions.capture-quality", "restrictions.branding"]);
    expect(first.fragments?.every(({ traceIds }) => traceIds.length === 1)).toBe(true);
    expect(first.fragments?.every(({ text }) => text.length > 0)).toBe(true);
    expect(first.fragments?.every(({ id }) => !id.includes("gemini"))).toBe(true);
  });
});
