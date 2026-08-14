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
    const restriction = fragments.find(({ id }) => id === "restrictions.additional-people");

    expect(first).toEqual(second);
    expect(fragments.map(({ id }) => id)).toEqual(["additional-person.person", "restrictions.additional-people"]);
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
