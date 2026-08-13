import { describe, expect, it } from "vitest";

import { additionalPersonProvider } from "../../../../src/plugins/additional-person/rules";
import { additionalPersonSection } from "../../../../src/plugins/additional-person/sections";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [additionalPersonProvider]);

describe("additional-person plugin", () => {
  it("keeps the explicit additional-person setting traceable", async () => {
    const state = await resolve({ scene: { additionalPerson: true } });

    expect(state.values).toEqual({ scene: { additionalPerson: true } });
    expect(state.trace.entries[0]).toMatchObject({ ruleId: "additional-person.presence", path: "scene.additionalPerson", sourceField: "scene.additionalPerson" });
  });

  it.each([
    ["Deutsch", "Keine zusätzliche Person hinzufügen."],
    ["English", "Do not add any additional people."],
  ])("renders resolved false deterministically in %s", async (promptLanguage, expected) => {
    const state = await resolve({ promptLanguage, scene: { additionalPerson: false } });

    expect(additionalPersonSection.provide(state)).toEqual(additionalPersonSection.provide(state));
    expect(additionalPersonSection.provide(state)[0]).toMatchObject({ text: expected });
    expect(additionalPersonSection.provide(state)[0]?.fragments).toEqual([{
      id: "restrictions.additional-people",
      text: expected,
      traceIds: additionalPersonSection.provide(state)[0]?.traceIds,
    }]);
  });

  it("does not invent a default when the resolved Boolean is absent", async () => {
    const state = await resolve({ promptLanguage: "English", scene: {} });

    expect(additionalPersonSection.provide(state)).toEqual([]);
  });

  it("preserves the V500-compatible positive additional-person representation", async () => {
    const state = await resolve({ promptLanguage: "English", scene: { additionalPerson: true } });

    expect(additionalPersonSection.provide(state)[0]?.text).toBe(
      "ADDITIONAL PERSON\nShow exactly two clearly adult people: the selected primary subject and a distinct random adult woman, positioned beside the primary subject, standing. The primary subject retains every selected identity attribute and remains visually primary. The second person has a clearly distinct identity. Do not merge, clone, duplicate, or exchange faces, bodies, hairstyles, or clothing.\n\nDo not add any person beyond the two specified adults.",
    );
  });
});
