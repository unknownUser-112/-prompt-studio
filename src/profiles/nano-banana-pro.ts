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
    : normalBlocks(document, german);
  return {
    id: PROFILE_IDS.nanoBananaPro,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: execution ? withExecutionContract(blocks) : blocks,
  };
}

function normalBlocks(document: Readonly<PromptDocument>, german: boolean): readonly TextLayoutBlock[] {
  const openLayer = hasFragment(document, "garment.compact-upper-layer-contract");
  const additionalPerson = hasFragment(document, "additional-person.compact-contract");
  const selfie = hasFragment(document, "selfie.compact-capture");
  const authorizedBranding = hasFragment(document, "restrictions.compact-final-authorized");
  const authorizedAdditionalPerson = hasFragment(document, "restrictions.additional-people-authorized");
  return [
    outputContractBlock(german),
    primarySubjectBlock(german),
    compactOutfitBlock(german, openLayer),
    ...(additionalPerson ? [
      group(german ? "ZWEITE ERWACHSENE PERSON" : "SECOND ADULT", [fragment("additional-person.compact-contract")]),
    ] : []),
    group(
      selfie ? (german ? "SELFIE-AUFNAHME" : "SELFIE CAPTURE") : (german ? "KAMERA" : "CAMERA"),
      [fragment(selfie ? "selfie.compact-capture" : "camera.compact-capture")],
    ),
    group(german ? "SZENE UND LICHT" : "SCENE AND LIGHT", [fragment("scene.compact-scene-light")]),
    group(german ? "FOTOGRAFISCHER REALISMUS" : "PHOTOGRAPHIC REALISM", [fragment("realism.compact-photographic")]),
    group(german ? "FINALE EINSCHRÄNKUNGEN" : "FINAL RESTRICTIONS", [
      fragment(authorizedBranding ? "restrictions.compact-final-authorized" : "restrictions.compact-final"),
    ]),
    fragment(
      authorizedAdditionalPerson ? "restrictions.additional-people-authorized" : "restrictions.additional-people",
      "\n\n",
    ),
  ];
}

function hasFragment(document: Readonly<PromptDocument>, fragmentId: string): boolean {
  return document.sections.some((section) => section.fragments.some(({ id }) => id === fragmentId));
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
      {
        kind: "fragment",
        fragmentId: "camera.selected-framing",
        prefix: german ? "Bildausschnitt: " : "Selected framing: ",
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

function compactOutfitBlock(german: boolean, openLayer: boolean): TextLayoutBlock {
  return group(german ? "EXAKTES OUTFIT" : "EXACT OUTFIT", [
    fragment("garment.compact-outfit"),
    ...(openLayer ? [{
      kind: "group" as const,
      heading: german ? "OBERKÖRPER-SCHICHTREGEL" : "UPPER-BODY LAYER CONTRACT",
      separatorBefore: "\n\n",
      children: [fragment("garment.compact-upper-layer-contract")],
    }] : []),
    fragment("garment.compact-selection-restriction", openLayer ? "\n" : "\n\n"),
  ]);
}
