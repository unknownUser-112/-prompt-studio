import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createNanoBananaProLayout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  return {
    id: PROFILE_IDS.nanoBananaPro,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: [
      outputContractBlock(promptLanguage === "Deutsch"),
      primarySubjectBlock(promptLanguage === "Deutsch"),
    ],
  };
}

function primarySubjectBlock(german: boolean): TextLayoutBlock {
  return {
    kind: "group",
    heading: german ? "VERBINDLICHE HAUPTPERSON" : "BINDING PRIMARY SUBJECT",
    separatorBefore: "\n\n",
    children: [
      { kind: "fragment", fragmentId: "character.primary-subject-contract" },
      {
        kind: "fragment",
        fragmentId: "pose.action",
        prefix: german ? "Pose und Ausdruck: " : "Pose and expression: ",
      },
      {
        kind: "fragment",
        fragmentId: "character.hairstyle",
        prefix: german ? "Frisur: " : "Hairstyle: ",
      },
    ],
  };
}

function outputContractBlock(german: boolean): TextLayoutBlock {
  return {
    kind: "group",
    heading: german ? "ABSOLUTER AUSGABEVERTRAG" : "ABSOLUTE OUTPUT CONTRACT",
    children: [{ kind: "fragment", fragmentId: "camera.output-contract" }],
  };
}
