import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const PERSON_DE = "Zeige genau zwei eindeutig erwachsene Personen: die ausgewählte Hauptperson und eine deutlich unterscheidbare zufällige erwachsene Frau, die neben der Hauptperson steht. Die Hauptperson behält alle ausgewählten Identitätsmerkmale und bleibt visuell vorrangig. Die zweite Person besitzt eine klar eigenständige Identität. Gesichter, Körper, Frisuren oder Kleidung dürfen nicht verschmolzen, geklont, dupliziert oder vertauscht werden.";
const PERSON_EN = "Show exactly two clearly adult people: the selected primary subject and a distinct random adult woman, positioned beside the primary subject, standing. The primary subject retains every selected identity attribute and remains visually primary. The second person has a clearly distinct identity. Do not merge, clone, duplicate, or exchange faces, bodies, hairstyles, or clothing.";
const SHARED_SELFIE_PERSON_DE = "Zeige genau zwei eindeutig erwachsene Personen: die ausgewählte Hauptperson und eine deutlich unterscheidbare zufällige erwachsene Frau, die neben der Hauptperson positioniert ist und das Selfie gemeinsam mit ihr aufnimmt. Die Hauptperson behält alle ausgewählten Identitätsmerkmale und bleibt visuell vorrangig. Die zweite Person besitzt eine klar eigenständige Identität. Gesichter, Körper, Frisuren oder Kleidung dürfen nicht verschmolzen, geklont, dupliziert oder vertauscht werden.";
const SHARED_SELFIE_PERSON_EN = "Show exactly two clearly adult people: the selected primary subject and a distinct random adult woman, positioned beside the primary subject, sharing the selfie. The primary subject retains every selected identity attribute and remains visually primary. The second person has a clearly distinct identity. Do not merge, clone, duplicate, or exchange faces, bodies, hairstyles, or clothing.";
const POSITIVE_RESTRICTION_DE = "Füge keine weitere Person über die beiden angegebenen Erwachsenen hinaus hinzu.";
const POSITIVE_RESTRICTION_EN = "Do not add any person beyond the two specified adults.";
const TWO_ADULT_IMAGE_GOAL_DE = "Erzeuge eine authentische, unbearbeitet wirkende Aufnahme von zwei realen Erwachsenen. Das Ergebnis soll wie ein glaubwürdig entstandenes Lifestylefoto wirken, nicht wie ein digitales Rendering.";
const TWO_ADULT_IMAGE_GOAL_EN = "Create an authentic, unretouched-looking photograph of two real adults. The result should feel like a genuinely captured lifestyle photograph, not a digital rendering.";
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
    const positiveActivity = details?.activity === "additionalPersonActivity.standing"
      || details?.activity === "additionalPersonActivity.shared_selfie";
    const completePositiveDetails = present
      && details?.enabled === true
      && details.type === "additionalPerson.randomWoman"
      && details.position === "additionalPersonPosition.beside"
      && positiveActivity;
    if (completePositiveDetails) {
      const sharedSelfie = details.activity === "additionalPersonActivity.shared_selfie";
      const person = sharedSelfie
        ? (german ? SHARED_SELFIE_PERSON_DE : SHARED_SELFIE_PERSON_EN)
        : (german ? PERSON_DE : PERSON_EN);
      const restriction = german ? POSITIVE_RESTRICTION_DE : POSITIVE_RESTRICTION_EN;
      const imageGoal = german ? TWO_ADULT_IMAGE_GOAL_DE : TWO_ADULT_IMAGE_GOAL_EN;
      const fragments = [
        createResolvedFragmentDraft(
          state,
          "additional-person",
          "additional-person.person",
          person,
          ["additionalPerson.activity", "additionalPerson.enabled", "additionalPerson.position", "additionalPerson.type", "scene.additionalPerson"],
        ),
        createResolvedFragmentDraft(state, "additional-person", "image-goal.two-adults", imageGoal, ["scene.additionalPerson"]),
        createResolvedFragmentDraft(state, "additional-person", "restrictions.additional-people-authorized", restriction, ["scene.additionalPerson"]),
      ];
      return [createResolvedSectionDraft(
        state,
        "additional-person",
        `${german ? "ZUSÄTZLICHE PERSON" : "ADDITIONAL PERSON"}\n${person}\n\n${restriction}`,
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
