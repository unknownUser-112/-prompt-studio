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
        "realism.natural-irregularity",
        "realism.spatial-material-light",
        "realism.photographic-character",
        "restrictions.capture-quality",
        "restrictions.capture-quality-detailed",
        "restrictions.branding",
      ]
      : ["style.general", "realism.natural-irregularity", "realism.spatial-material-light", "realism.photographic-character", "restrictions.capture-quality", "restrictions.capture-quality-detailed", "restrictions.branding"]);
    expect(first.fragments?.every(({ traceIds }) => traceIds.length === 1)).toBe(true);
    expect(first.fragments?.every(({ text }) => text.length > 0)).toBe(true);
    expect(first.fragments?.every(({ id }) => !id.includes("gemini"))).toBe(true);
  });

  it.each([
    ["Deutsch", "Natürliche Unregelmäßigkeit hat Vorrang vor makelloser visueller Perfektion."],
    ["English", "Natural irregularity takes priority over flawless visual perfection."],
  ])("exposes exact resolved natural irregularity in %s", async (promptLanguage, expectedText) => {
    const state = await resolve({ promptLanguage, model: { behaviour: "style.authentic_lifestyle" } });
    const first = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.natural-irregularity");
    const second = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.natural-irregularity");

    expect(first).toEqual(second);
    expect(first?.text).toBe(expectedText);
    expect(first?.text.trim()).not.toBe("");
    expect(first?.text).not.toContain("NATURAL HUMAN DETAIL");
    expect(first?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
  });

  it.each([
    [
      "Deutsch",
      "Die Aufnahme zeigt glaubwürdige Anatomie, realistische Raumgeometrie und konsistente Material- und Lichtphysik.",
      "Glaubwürdige Anatomie sowie konsistente Raum-, Material- und Lichtphysik.",
    ],
    [
      "English",
      "The photograph must show believable anatomy, realistic spatial geometry, and consistent material and lighting physics.",
      "Credible anatomy and consistent spatial, material, and lighting physics.",
    ],
  ])("adds exact photographic character without changing spatial-material-light in %s", async (promptLanguage, expectedText, existingText) => {
    const state = await resolve({ promptLanguage, model: { behaviour: "style.authentic_lifestyle" } });
    const first = modelBehaviourSection.provide(state)[0]!;
    const second = modelBehaviourSection.provide(state)[0]!;
    const photographicCharacter = first.fragments?.find(({ id }) => id === "realism.photographic-character");
    const spatialMaterialLight = first.fragments?.find(({ id }) => id === "realism.spatial-material-light");

    expect(first).toEqual(second);
    expect(photographicCharacter?.text).toBe(expectedText);
    expect(photographicCharacter?.text.trim()).not.toBe("");
    expect(photographicCharacter?.text).not.toContain("PHOTOGRAPHIC CHARACTER");
    expect(photographicCharacter?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
    expect(spatialMaterialLight).toEqual({
      id: "realism.spatial-material-light",
      text: existingText,
      traceIds: ["model.behaviour:model-behaviour.selection"],
    });
  });

  it.each([
    [
      "Deutsch",
      "Keine künstliche Hautglättung, keine übertriebene Hintergrundunschärfe, kein starkes Cinematic Color Grading und kein Wasserzeichen.",
      "Keine künstliche Hautglättung, keine übertriebene Unschärfe, kein starkes Cinematic Color Grading und kein Wasserzeichen.",
    ],
    [
      "English",
      "No artificial skin smoothing, no excessive background blur, no heavy cinematic color grading, and no watermark.",
      "No artificial skin smoothing, excessive blur, heavy cinematic grading, or watermark.",
    ],
  ])("adds detailed capture-quality restrictions without changing the existing fragment in %s", async (promptLanguage, expectedText, existingText) => {
    const state = await resolve({ promptLanguage, model: { behaviour: "style.authentic_lifestyle" } });
    const first = modelBehaviourSection.provide(state)[0]!;
    const second = modelBehaviourSection.provide(state)[0]!;
    const detailed = first.fragments?.find(({ id }) => id === "restrictions.capture-quality-detailed");
    const existing = first.fragments?.find(({ id }) => id === "restrictions.capture-quality");

    expect(first).toEqual(second);
    expect(detailed?.text).toBe(expectedText);
    expect(detailed?.text.trim()).not.toBe("");
    expect(detailed?.text).not.toContain("RESTRICTIONS");
    expect(detailed?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
    expect(existing).toEqual({
      id: "restrictions.capture-quality",
      text: existingText,
      traceIds: ["model.behaviour:model-behaviour.selection"],
    });
  });
});
