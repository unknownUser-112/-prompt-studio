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

  it("projects all authoritative additional-person facts and binds positive presence", async () => {
    const input = {
      scene: { additionalPerson: false },
      additionalPerson: {
        enabled: true,
        type: "additionalPerson.randomWoman",
        position: "additionalPersonPosition.beside",
        activity: "additionalPersonActivity.standing",
      },
    };

    const state = await resolve(input);

    expect(state.values).toEqual({
      additionalPerson: input.additionalPerson,
      scene: { additionalPerson: true },
    });
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      factTrace("activity"),
      factTrace("enabled"),
      factTrace("position"),
      factTrace("type"),
      {
        id: "scene.additionalPerson:additional-person.presence",
        path: "scene.additionalPerson",
        ruleId: "additional-person.presence",
        sourceField: "additionalPerson.enabled",
      },
    ]);
    expect(await resolve(input)).toEqual(state);
  });

  it("uses explicit disabled presence without competing with the baseline fact", async () => {
    const state = await resolve({
      scene: { additionalPerson: true },
      additionalPerson: { enabled: false },
    });

    expect(state.values).toEqual({ additionalPerson: { enabled: false }, scene: { additionalPerson: false } });
    expect(state.trace.entries.filter(({ path }) => path === "scene.additionalPerson")).toHaveLength(1);
    expect(state.trace.entries.find(({ path }) => path === "scene.additionalPerson")?.sourceField).toBe("additionalPerson.enabled");
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

  it.each(["Deutsch", "English"])("materializes exact positive person and restriction fragments in %s", async (promptLanguage) => {
    const state = await resolve({
      promptLanguage,
      scene: { additionalPerson: false },
      additionalPerson: {
        enabled: true,
        type: "additionalPerson.randomWoman",
        position: "additionalPersonPosition.beside",
        activity: "additionalPersonActivity.standing",
      },
    });
    const first = additionalPersonSection.provide(state)[0]!;
    const second = additionalPersonSection.provide(state)[0]!;
    const fragments = first.fragments ?? [];
    const person = fragments.find(({ id }) => id === "additional-person.person");
    const restriction = fragments.find(({ id }) => id === "restrictions.additional-people-authorized");
    const imageGoal = fragments.find(({ id }) => id === "image-goal.two-adults");

    expect(first).toEqual(second);
    expect(fragments.map(({ id }) => id)).toEqual([
      "additional-person.person",
      "additional-person.compact-contract",
      "image-goal.two-adults",
      "restrictions.additional-people-authorized",
    ]);
    expect(person?.text).not.toMatch(/^ADDITIONAL PERSON\n/u);
    expect(person?.text).toContain(promptLanguage === "Deutsch" ? "neben der Hauptperson" : "positioned beside the primary subject, standing");
    expect(person?.traceIds).toEqual([
      "additionalPerson.activity:additional-person.activity",
      "additionalPerson.enabled:additional-person.enabled",
      "additionalPerson.position:additional-person.position",
      "additionalPerson.type:additional-person.type",
      "scene.additionalPerson:additional-person.presence",
    ]);
    expect(restriction?.text).toBe(promptLanguage === "Deutsch"
      ? "Füge keine weitere Person über die beiden angegebenen Erwachsenen hinaus hinzu."
      : "Do not add any person beyond the two specified adults.");
    expect(restriction?.traceIds).toEqual(["scene.additionalPerson:additional-person.presence"]);
    expect(imageGoal?.text).toBe(promptLanguage === "Deutsch"
      ? "Erzeuge eine authentische, unbearbeitet wirkende Aufnahme von zwei realen Erwachsenen. Das Ergebnis soll wie ein glaubwürdig entstandenes Lifestylefoto wirken, nicht wie ein digitales Rendering."
      : "Create an authentic, unretouched-looking photograph of two real adults. The result should feel like a genuinely captured lifestyle photograph, not a digital rendering.");
    expect(imageGoal?.traceIds).toEqual(["scene.additionalPerson:additional-person.presence"]);
  });

  it("materializes shared-selfie semantics without falling back to standing", async () => {
    const state = await resolve({
      promptLanguage: "English",
      additionalPerson: {
        enabled: true,
        type: "additionalPerson.randomWoman",
        position: "additionalPersonPosition.beside",
        activity: "additionalPersonActivity.shared_selfie",
      },
    });
    const section = additionalPersonSection.provide(state)[0]!;
    const fragments = section.fragments ?? [];
    const person = fragments.find(({ id }) => id === "additional-person.person");

    expect(person?.text).toBe(
      "Show exactly two clearly adult people: the selected primary subject and a distinct random adult woman, positioned beside the primary subject, sharing the selfie. The primary subject retains every selected identity attribute and remains visually primary. The second person has a clearly distinct identity. Do not merge, clone, duplicate, or exchange faces, bodies, hairstyles, or clothing.",
    );
    expect(person?.text).not.toContain("standing");
    expect(fragments.map(({ id }) => id)).toEqual([
      "additional-person.person",
      "additional-person.compact-contract",
      "image-goal.two-adults",
      "restrictions.additional-people-authorized",
    ]);
    expect(person?.traceIds).toEqual([
      "additionalPerson.activity:additional-person.activity",
      "additionalPerson.enabled:additional-person.enabled",
      "additionalPerson.position:additional-person.position",
      "additionalPerson.type:additional-person.type",
      "scene.additionalPerson:additional-person.presence",
    ]);
  });

  it("materializes exactly one positive or negative additional-person restriction", async () => {
    const positive = await resolve({
      promptLanguage: "English",
      additionalPerson: {
        enabled: true,
        type: "additionalPerson.randomWoman",
        position: "additionalPersonPosition.beside",
        activity: "additionalPersonActivity.standing",
      },
    });
    const negative = await resolve({ promptLanguage: "English", scene: { additionalPerson: false } });

    expect(additionalPersonSection.provide(positive)[0]?.fragments?.map(({ id }) => id)).not.toContain("restrictions.additional-people");
    expect(additionalPersonSection.provide(negative)[0]?.fragments?.map(({ id }) => id)).toEqual(["restrictions.additional-people"]);
  });

  it.each([
    [
      "additionalPersonActivity.standing",
      "Show exactly two clearly adult people: the selected primary subject and a distinct random adult woman, directly beside the primary subject. The second adult has a clearly distinct identity and different clothing. Both adults stand fully inside the frame; the second adult is also visible from head to toe with both feet shown. The primary subject remains visually dominant. No third person, cloned face, duplicate body, or exchanged clothing.",
    ],
    [
      "additionalPersonActivity.shared_selfie",
      "Show exactly two clearly adult people: the selected primary subject and a distinct random adult woman, directly beside the primary subject. The second adult has a clearly distinct identity and different clothing. Keep the second adult fully inside the selected framing and do not crop her at the edge. The primary subject remains visually dominant. No third person, cloned face, duplicate body, or exchanged clothing.",
    ],
  ])("materializes the compact additional-person contract for %s", async (activity, expected) => {
    const state = await resolve({
      promptLanguage: "English",
      additionalPerson: {
        enabled: true,
        type: "additionalPerson.randomWoman",
        position: "additionalPersonPosition.beside",
        activity,
      },
    });
    const fragments = additionalPersonSection.provide(state)[0]?.fragments ?? [];
    const compact = fragments.find(({ id }) => id === "additional-person.compact-contract");

    expect(compact?.text).toBe(expected);
    expect(compact?.traceIds).toEqual([
      "additionalPerson.activity:additional-person.activity",
      "additionalPerson.enabled:additional-person.enabled",
      "additionalPerson.position:additional-person.position",
      "additionalPerson.type:additional-person.type",
      "scene.additionalPerson:additional-person.presence",
    ]);
    expect(fragments.find(({ id }) => id === "additional-person.person")?.text).toContain(
      activity === "additionalPersonActivity.shared_selfie" ? "sharing the selfie" : "standing",
    );
  });
});

function factTrace(field: string) {
  return {
    id: `additionalPerson.${field}:additional-person.${field}`,
    path: `additionalPerson.${field}`,
    ruleId: `additional-person.${field}`,
    sourceField: `additionalPerson.${field}`,
  };
}
