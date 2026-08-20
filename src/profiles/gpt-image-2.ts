import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createGptImage2Layout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  const german = promptLanguage === "Deutsch";
  const referenceSheet = hasFragment(document, "character.reference-sheet");
  const execution = hasFragment(document, "execution.image-generation");
  const blocks = referenceSheet ? referenceSheetBlocks(german) : normalBlocks(document, german);
  return {
    id: PROFILE_IDS.gptImage2,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: execution ? withExecutionContract(blocks) : blocks,
  };
}

function normalBlocks(document: Readonly<PromptDocument>, german: boolean): readonly TextLayoutBlock[] {
  const sectionsBySlot = new Map(document.sections.map((section) => [section.slotId, section]));
  const section = (slotId: string, separatorBefore: string): TextLayoutBlock => {
    const selected = sectionsBySlot.get(slotId);
    if (selected === undefined) throw new Error(`GPT Image 2 layout requires section slot: ${slotId}`);
    return { kind: "section", sectionId: selected.id, separatorBefore };
  };
  const selfie = hasFragment(document, "selfie.capture");
  const singleReference = hasFragment(document, "character.single-reference");
  const additionalPerson = hasFragment(document, "additional-person.person");
  const openGarment = hasFragment(document, "garment.upper-body");
  const openOrganza = openGarment && hasFragment(document, "garment.outfit-build");
  const camera = selfie
    ? group(german ? "KAMERA / PERSPEKTIVE" : "CAMERA / PERSPECTIVE", [fragment("selfie.capture")])
    : section("camera", "\n\n");
  return [
    heading(german
      ? "Erstelle eine realistische Fotografie nach dieser verbindlichen Bildbeschreibung:"
      : "Create one realistic photograph from this binding image brief:"),
    { ...camera, separatorBefore: "\n\n" },
    ...(openOrganza ? [group(german ? "OBERKÖRPER-SCHICHTREGEL" : "UPPER-BODY LAYER RULE", [
      fragment("garment.upper-body"),
      fragment("garment.layering"),
    ], " ")] : []),
    section("character-sheet-a-subject", "\n\n"),
    section("character-sheet-b-skin", "\n"),
    openGarment && !openOrganza ? openGarmentOutfitBlock(german) : section("garment", "\n\n"),
    section("character-sheet-c-pose", openGarment && !openOrganza ? "\n\n" : "\n"),
    section("scene-lighting", "\n\n"),
    section("model-behaviour", "\n\n"),
    fragment("restrictions.preservation-contract", "\n"),
    section("character-sheet-d-face", "\n\n"),
    ...(!german ? [section("adaptive-realism-b-capture", "\n\n")] : []),
    section("material-physics-a-material", "\n\n"),
    section("adaptive-realism-a-reference", "\n\n"),
    section("material-physics-b-context", "\n\n"),
    ...(singleReference ? [group(german ? "EINZELNES REFERENZFOTO" : "SINGLE REFERENCE CAPTURE", [fragment("character.single-reference")])] : []),
    ...(selfie ? [group(german ? "SELFIE-AUFNAHME" : "SELFIE CAPTURE", [fragment("selfie.geometry")])] : []),
    ...(additionalPerson ? [group(german ? "ZUSÄTZLICHE PERSON" : "ADDITIONAL PERSON", [fragment("additional-person.person")])] : []),
    fragment(additionalPerson ? "restrictions.additional-people-authorized" : "restrictions.additional-people", "\n\n"),
  ];
}

function openGarmentOutfitBlock(german: boolean): TextLayoutBlock {
  return group(german ? "OUTFIT & ACCESSOIRES" : "OUTFIT AND ACCESSORIES", [
    group(german ? "OBERKÖRPER-SCHICHTVERTRAG" : "UPPER-BODY LAYER CONTRACT", [
      fragment("garment.upper-body"),
      fragment("garment.layering"),
    ], " "),
    { ...group(undefined, [fragment("garment.outfit"), fragment("garment.material-behaviour")], " "), separatorBefore: "\n" },
  ]);
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

function hasFragment(document: Readonly<PromptDocument>, fragmentId: string): boolean {
  return document.sections.some((section) => section.fragments.some(({ id }) => id === fragmentId));
}

function heading(text: string): TextLayoutBlock {
  return { kind: "heading", text };
}

function fragment(fragmentId: string, separatorBefore?: string): TextLayoutBlock {
  return { kind: "fragment", fragmentId, ...(separatorBefore === undefined ? {} : { separatorBefore }) };
}

function group(
  headingText: string | undefined,
  children: readonly TextLayoutBlock[],
  separatorBetweenChildren = "\n",
): TextLayoutBlock {
  return { kind: "group", heading: headingText, separatorBefore: "\n\n", separatorBetweenChildren, children };
}

function withExecutionContract(blocks: readonly TextLayoutBlock[]): readonly TextLayoutBlock[] {
  return [
    group("IMAGE GENERATION EXECUTION", [fragment("execution.image-generation")]),
    { ...heading("===== IMAGE PROMPT ====="), separatorBefore: "\n\n" },
    ...(blocks.length === 0 ? [] : [{ ...blocks[0]!, separatorBefore: "\n\n" }, ...blocks.slice(1)]),
  ];
}
