import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createNanoBananaProLayout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  const german = promptLanguage === "Deutsch";
  const referenceSheet = document.sections.some((section) => section.fragments.some(({ id }) => id === "character.reference-sheet"));
  const execution = document.sections.some((section) => section.fragments.some(({ id }) => id === "execution.single-photograph"));
  const blocks = referenceSheet
    ? referenceSheetBlocks(german)
    : [outputContractBlock(german), primarySubjectBlock(german)];
  return {
    id: PROFILE_IDS.nanoBananaPro,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: execution ? withExecutionContract(blocks) : blocks,
  };
}

function referenceSheetBlocks(german: boolean): readonly TextLayoutBlock[] {
  return [
    group(german ? "CHARAKTER-REFERENZTAFEL" : "CHARACTER REFERENCE SHEET", [fragment("character.reference-sheet")]),
    group(german ? "FOTOGRAFISCHE AUFNAHME" : "PHOTOGRAPHIC CAPTURE", [fragment("character.reference-capture")]),
    group(undefined, [
      fragment("character.subject"),
      fragment("garment.outfit"),
      fragment("garment.material-behaviour"),
      fragment("character.reference-consistency"),
      fragment("character.reference-layout"),
      { ...fragment("material.physics"), prefix: german ? "Materialphysik: " : "Material physics: " },
      { ...fragment("realism.adaptive"), prefix: german ? "Realismus: " : "Realism: " },
      fragment("restrictions.reference-views"),
    ], " "),
    fragment("restrictions.additional-people", "\n\n"),
  ];
}

function fragment(fragmentId: string, separatorBefore?: string): TextLayoutBlock {
  return { kind: "fragment", fragmentId, ...(separatorBefore === undefined ? {} : { separatorBefore }) };
}

function group(
  heading: string | undefined,
  children: readonly TextLayoutBlock[],
  separatorBetweenChildren = "\n",
): TextLayoutBlock {
  return { kind: "group", heading, separatorBefore: "\n\n", separatorBetweenChildren, children };
}

function withExecutionContract(blocks: readonly TextLayoutBlock[]): readonly TextLayoutBlock[] {
  return [
    { kind: "group", heading: "IMAGE GENERATION EXECUTION", children: [{ kind: "fragment", fragmentId: "execution.single-photograph" }] },
    ...(blocks.length === 0 ? [] : [{ ...blocks[0]!, separatorBefore: "\n\n" }, ...blocks.slice(1)]),
  ];
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
