import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createFluxLayout(document: Readonly<PromptDocument>, promptLanguage: PromptLanguage): ProfileLayout {
  const execution = hasFragment(document, "execution.image-generation");
  const blocks = createFluxContentBlocks(document, promptLanguage);
  return {
    id: PROFILE_IDS.flux,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: execution ? withFluxExecutionContract(blocks) : blocks,
  };
}

export function createFluxContentBlocks(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): readonly TextLayoutBlock[] {
  const german = promptLanguage === "Deutsch";
  return hasFragment(document, "character.reference-sheet") ? referenceBlocks() : normalBlocks(document, german);
}

function normalBlocks(document: Readonly<PromptDocument>, german: boolean): readonly TextLayoutBlock[] {
  const sectionsBySlot = new Map(document.sections.map((sectionDraft) => [sectionDraft.slotId, sectionDraft.id]));
  const section = (slotId: string): TextLayoutBlock => {
    const sectionId = sectionsBySlot.get(slotId);
    if (sectionId === undefined) throw new Error(`FLUX layout requires section slot: ${slotId}`);
    return { kind: "section", sectionId, separatorBefore: "\n\n" };
  };
  const selfie = hasFragment(document, "selfie.capture");
  const additionalPerson = hasFragment(document, "additional-person.person");
  const singleReference = hasFragment(document, "character.single-reference");
  const openLayer = hasFragment(document, "garment.upper-body");
  const primary = german ? germanPrimary() : englishPrimary(selfie);
  return [
    primary,
    group(german ? "GESICHTSMERKMALE" : "FACIAL FEATURES", [fragment("character.facial-features")]),
    ...(!german ? [group("SKIN AND CAPTURE APPEARANCE", [fragment("realism.capture-appearance")])] : []),
    section("material-physics-a-material"),
    section("adaptive-realism-a-reference"),
    section("material-physics-b-context"),
    ...(singleReference ? [group(german ? "EINZELNES REFERENZFOTO" : "SINGLE REFERENCE CAPTURE", [fragment("character.single-reference")])] : []),
    ...(selfie ? [group(german ? "SELFIE-AUFNAHME" : "SELFIE CAPTURE", [fragment("selfie.geometry")])] : []),
    ...(additionalPerson ? [group(german ? "ZUSÄTZLICHE PERSON" : "ADDITIONAL PERSON", [fragment("additional-person.person")])] : []),
    fragment(additionalPerson ? "restrictions.additional-people-authorized" : "restrictions.additional-people", "\n\n"),
    ...(openLayer ? [group(german ? "OBERKÖRPER-SCHICHTREGEL" : "UPPER-BODY LAYER CONTRACT", [
      fragment("garment.upper-body"),
      fragment("garment.layering"),
    ], " ")] : []),
  ];
}

function germanPrimary(): TextLayoutBlock {
  return group(undefined, [
    fragment("character.compact-identity"),
    fragment("pose.compact-action"),
    { ...fragment("garment.compact-items"), prefix: "wearing " },
    fragment("camera.selected-framing"),
    fragment("camera.compact-system"),
    fragment("lighting.capture"),
    fragment("scene.compact-location"),
    fragment("realism.compact-human-detail"),
    heading("realistic fabric tension"),
    heading("coherent shadows"),
    heading("authentic photography"),
  ], ", ", "");
}

function englishPrimary(selfie: boolean): TextLayoutBlock {
  return group(undefined, [
    fragment("character.subject"),
    fragment("pose.action"),
    fragment("garment.outfit"),
    fragment("garment.material-behaviour"),
    fragment(selfie ? "selfie.capture" : "camera.capture"),
    fragment("scene.environment"),
    fragment("scene.natural-details"),
    fragment("lighting.capture"),
    fragment("lighting.white-balance"),
    fragment("realism.skin"),
    heading("authentic photography, realistic fabric tension, coherent shadows"),
  ], " ", "");
}

function referenceBlocks(): readonly TextLayoutBlock[] {
  return [
    group(undefined, [
      { ...fragment("character.reference-sheet"), prefix: "CHARACTER REFERENCE SHEET " },
      { ...fragment("character.reference-capture"), prefix: "PHOTOGRAPHIC CAPTURE " },
      fragment("character.subject"),
      fragment("garment.outfit"),
      fragment("garment.material-behaviour"),
      fragment("character.reference-consistency"),
      fragment("character.reference-layout"),
      { ...fragment("material.inline-physics"), prefix: "Material physics: " },
      { ...fragment("realism.adaptive"), prefix: "Realism: " },
      fragment("restrictions.reference-views"),
    ], " ", ""),
    group("FACIAL FEATURES", [fragment("character.facial-features")]),
    group("SKIN AND CAPTURE APPEARANCE", [fragment("realism.capture-appearance")]),
    fragment("restrictions.additional-people", "\n\n"),
  ];
}

function hasFragment(document: Readonly<PromptDocument>, id: string): boolean {
  return document.sections.some((section) => section.fragments.some((fragmentDraft) => fragmentDraft.id === id));
}

function fragment(fragmentId: string, separatorBefore?: string): TextLayoutBlock {
  return { kind: "fragment", fragmentId, ...(separatorBefore === undefined ? {} : { separatorBefore }) };
}

function heading(text: string): TextLayoutBlock {
  return { kind: "heading", text };
}

function group(
  headingText: string | undefined,
  children: readonly TextLayoutBlock[],
  separatorBetweenChildren = "\n",
  separatorBefore = "\n\n",
): TextLayoutBlock {
  return { kind: "group", heading: headingText, separatorBefore, separatorBetweenChildren, children };
}

export function withFluxExecutionContract(blocks: readonly TextLayoutBlock[]): readonly TextLayoutBlock[] {
  return [
    group("IMAGE GENERATION EXECUTION", [fragment("execution.image-generation")]),
    { ...heading("===== IMAGE PROMPT ====="), separatorBefore: "\n\n" },
    ...(blocks.length === 0 ? [] : [{ ...blocks[0]!, separatorBefore: "\n\n" }, ...blocks.slice(1)]),
  ];
}
