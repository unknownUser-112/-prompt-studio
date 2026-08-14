import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const PERSON_DE = "Zeige genau zwei eindeutig erwachsene Personen: die ausgewählte Hauptperson und eine deutlich unterscheidbare zufällige erwachsene Frau, die neben der Hauptperson steht. Die Hauptperson behält alle ausgewählten Identitätsmerkmale und bleibt visuell vorrangig. Die zweite Person besitzt eine klar eigenständige Identität. Gesichter, Körper, Frisuren oder Kleidung dürfen nicht verschmolzen, geklont, dupliziert oder vertauscht werden.";
const PERSON_EN = "Show exactly two clearly adult people: the selected primary subject and a distinct random adult woman, positioned beside the primary subject, standing. The primary subject retains every selected identity attribute and remains visually primary. The second person has a clearly distinct identity. Do not merge, clone, duplicate, or exchange faces, bodies, hairstyles, or clothing.";
const POSITIVE_RESTRICTION_DE = "Füge keine weitere Person über die beiden angegebenen Erwachsenen hinaus hinzu.";
const POSITIVE_RESTRICTION_EN = "Do not add any person beyond the two specified adults.";
const NEGATIVE_DE = "Keine zusätzliche Person hinzufügen.";
const NEGATIVE_EN = "Do not add any additional people.";
const POSITIVE_EN = `ADDITIONAL PERSON\n${PERSON_EN}\n\n${POSITIVE_RESTRICTION_EN}`;

export const additionalPersonSection: PromptSectionProvider = {
  id: "additional-person",
  provide: (state) => {
    const present = nestedValue(state.values, "scene", "additionalPerson");
    if (typeof present !== "boolean") return [];
    const german = state.facts.values.promptLanguage === "Deutsch";
    const details = objectAt(state.values, "additionalPerson");
    const completePositiveDetails = present
      && details?.enabled === true
      && details.type === "additionalPerson.randomWoman"
      && details.position === "additionalPersonPosition.beside"
      && details.activity === "additionalPersonActivity.standing";
    if (completePositiveDetails) {
      const person = german ? PERSON_DE : PERSON_EN;
      const restriction = german ? POSITIVE_RESTRICTION_DE : POSITIVE_RESTRICTION_EN;
      const fragments = [
        createResolvedFragmentDraft(
          state,
          "additional-person",
          "additional-person.person",
          person,
          ["additionalPerson.activity", "additionalPerson.enabled", "additionalPerson.position", "additionalPerson.type", "scene.additionalPerson"],
        ),
        createResolvedFragmentDraft(state, "additional-person", "restrictions.additional-people", restriction, ["scene.additionalPerson"]),
      ];
      return [createResolvedSectionDraft(
        state,
        "additional-person",
        german ? `ZUSÄTZLICHE PERSON\n${PERSON_DE}\n\n${POSITIVE_RESTRICTION_DE}` : POSITIVE_EN,
        fragments,
      )];
    }
    if (present) return [createResolvedSectionDraft(state, "additional-person", POSITIVE_EN)];
    const text = german ? NEGATIVE_DE : NEGATIVE_EN;
    const fragment = createResolvedFragmentDraft(state, "additional-person", "restrictions.additional-people", text, ["scene.additionalPerson"]);
    return [createResolvedSectionDraft(state, "additional-person", text, [fragment])];
  },
};

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[key];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? child as Readonly<Record<string, unknown>>
    : undefined;
}

function nestedValue(value: unknown, first: string, second: string): unknown {
  return objectAt(value, first)?.[second];
}
