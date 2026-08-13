import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const POSITIVE_EN = "ADDITIONAL PERSON\nShow exactly two clearly adult people: the selected primary subject and a distinct random adult woman, positioned beside the primary subject, standing. The primary subject retains every selected identity attribute and remains visually primary. The second person has a clearly distinct identity. Do not merge, clone, duplicate, or exchange faces, bodies, hairstyles, or clothing.\n\nDo not add any person beyond the two specified adults.";

export const additionalPersonSection: PromptSectionProvider = {
  id: "additional-person",
  provide: (state) => {
    const additionalPerson = readAdditionalPerson(state.values);
    if (additionalPerson === undefined) return [];
    const text = additionalPerson
      ? POSITIVE_EN
      : state.facts.values.promptLanguage === "Deutsch"
        ? "Keine zusätzliche Person hinzufügen."
        : "Do not add any additional people.";
    return [createResolvedSectionDraft(state, "additional-person", text)];
  },
};

function readAdditionalPerson(values: unknown): boolean | undefined {
  if (values === null || Array.isArray(values) || typeof values !== "object") return undefined;
  const scene = (values as Readonly<Record<string, unknown>>).scene;
  if (scene === null || Array.isArray(scene) || typeof scene !== "object") return undefined;
  const value = (scene as Readonly<Record<string, unknown>>).additionalPerson;
  return typeof value === "boolean" ? value : undefined;
}
