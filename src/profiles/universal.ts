import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

const UNIVERSAL_SLOT_ORDER = [
  "camera",
  "character-sheet-a-subject",
  "character-sheet-b-skin",
  "garment",
  "character-sheet-c-pose",
  "scene-lighting",
  "model-behaviour",
  "character-sheet-d-face",
  "adaptive-realism-b-capture",
  "material-physics-a-material",
  "adaptive-realism-a-reference",
  "material-physics-b-context",
  "additional-person",
] as const;

const UNIVERSAL_SEPARATOR_BEFORE_BY_SLOT: Partial<Record<(typeof UNIVERSAL_SLOT_ORDER)[number], string>> = {
  "character-sheet-a-subject": "\n\n",
  "character-sheet-b-skin": "\n",
  garment: "\n\n",
  "character-sheet-c-pose": "\n",
  "scene-lighting": "\n\n",
  "model-behaviour": "\n\n",
  "character-sheet-d-face": "\n",
  "adaptive-realism-b-capture": "\n\n",
  "material-physics-a-material": "\n\n",
  "adaptive-realism-a-reference": "\n\n",
  "material-physics-b-context": "\n\n",
  "additional-person": "\n\n",
};

export function createUniversalLayout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  const sectionsBySlot = new Map(document.sections.map((section) => [section.slotId, section]));
  const sections = UNIVERSAL_SLOT_ORDER.flatMap((slotId) => {
    const section = sectionsBySlot.get(slotId);
    return section === undefined ? [] : [{ section, slotId }];
  }).map(({ section, slotId }, order) => ({
    sectionId: section.id,
    order,
    separatorBefore: UNIVERSAL_SEPARATOR_BEFORE_BY_SLOT[slotId],
  }));
  const german = promptLanguage === "Deutsch";
  const referenceSheet = hasFragment(document, "character.reference-sheet");
  const singleReference = hasFragment(document, "character.single-reference");
  const execution = document.sections.some((section) => section.fragments.some(({ id }) => id === "execution.image-generation"));
  const baselineBlocks = sections.map((section) => ({
    kind: "section" as const,
    sectionId: section.sectionId,
    separatorBefore: section.separatorBefore,
  }));
  const modeBlocks = referenceSheet
    ? referenceSheetBlocks(german)
    : singleReference
      ? singleReferenceBlocks(baselineBlocks, german)
      : baselineBlocks;
  return {
    id: PROFILE_IDS.universal,
    sections,
    ...((referenceSheet || singleReference || execution)
      ? { textBlocks: execution ? withExecutionContract(modeBlocks) : modeBlocks }
      : {}),
  };
}

function hasFragment(document: Readonly<PromptDocument>, fragmentId: string): boolean {
  return document.sections.some((section) => section.fragments.some(({ id }) => id === fragmentId));
}

function singleReferenceBlocks(blocks: readonly TextLayoutBlock[], german: boolean): readonly TextLayoutBlock[] {
  return [
    ...blocks.slice(0, -1),
    group(german ? "EINZELNES REFERENZFOTO" : "SINGLE REFERENCE CAPTURE", [fragment("character.single-reference")]),
    ...blocks.slice(-1),
  ];
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
    group(german ? "GESICHTSMERKMALE" : "FACIAL FEATURES", [fragment("character.facial-features")]),
    ...(!german ? [group("SKIN AND CAPTURE APPEARANCE", [fragment("realism.capture-appearance")])] : []),
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
    { kind: "group", heading: "IMAGE GENERATION EXECUTION", children: [{ kind: "fragment", fragmentId: "execution.image-generation" }] },
    { kind: "heading", text: "===== IMAGE PROMPT =====", separatorBefore: "\n\n" },
    ...(blocks.length === 0 ? [] : [{ ...blocks[0]!, separatorBefore: "\n\n" }, ...blocks.slice(1)]),
  ];
}
