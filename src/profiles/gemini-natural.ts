import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createGeminiNaturalLayout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  const german = promptLanguage === "Deutsch";
  const referenceSheet = document.sections.some((section) => section.fragments.some(({ id }) => id === "character.reference-sheet"));
  const singleReference = document.sections.some((section) => section.fragments.some(({ id }) => id === "character.single-reference"));
  const selfie = document.sections.some((section) => section.fragments.some(({ id }) => id === "selfie.binding"));
  const additionalPerson = document.sections.some((section) => section.fragments.some(({ id }) => id === "additional-person.person"));
  const openGarment = document.sections.some((section) => section.fragments.some(({ id }) => id === "garment.state"));
  const authorizedBranding = document.sections.some((section) => section.fragments.some(({ id }) => id === "restrictions.branding-authorized"));
  const execution = document.sections.some((section) => section.fragments.some(({ id }) => id === "execution.image-generation"));
  const baselineBlocks = german ? germanBlocks(authorizedBranding) : englishBlocks(authorizedBranding);
  const modeBlocks = referenceSheet
    ? referenceSheetBlocks(german)
    : singleReference
      ? singleReferenceBlocks(baselineBlocks, german)
      : selfie
        ? selfieBlocks(baselineBlocks, german)
        : baselineBlocks;
  const primaryBlocks = openGarment ? openGarmentBlocks(modeBlocks, german) : modeBlocks;
  const finalBlocks = additionalPerson ? additionalPersonBlocks(primaryBlocks, german) : primaryBlocks;
  return {
    id: PROFILE_IDS.geminiNatural,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: execution ? withExecutionContract(finalBlocks) : finalBlocks,
  };
}

function openGarmentBlocks(blocks: readonly TextLayoutBlock[], german: boolean): readonly TextLayoutBlock[] {
  return [
    blocks[0]!,
    group(german ? "OBERKÖRPER-SCHICHTVERTRAG" : "UPPER-BODY LAYER CONTRACT", [
      fragment("garment.upper-body"),
      fragment("garment.layering"),
    ], " "),
    blocks[1]!,
    blocks[2]!,
    { ...group(german ? "VERBINDLICHER KLEIDUNGSZUSTAND" : "BINDING GARMENT STATE", [fragment("garment.state")]), separatorBefore: "\n" },
    { ...blocks[3]!, separatorBefore: "\n\n\n" },
    ...blocks.slice(4),
  ];
}

function additionalPersonBlocks(blocks: readonly TextLayoutBlock[], german: boolean): readonly TextLayoutBlock[] {
  return [
    ...blocks.slice(0, -1),
    group(german ? "ZUSÄTZLICHE PERSON" : "ADDITIONAL PERSON", [fragment("additional-person.person")]),
    ...blocks.slice(-1),
  ];
}

function selfieBlocks(baselineBlocks: readonly TextLayoutBlock[], german: boolean): readonly TextLayoutBlock[] {
  return [
    baselineBlocks[0]!,
    { ...group(german ? "VERBINDLICHE SELFIE-AUFNAHME" : "BINDING SELFIE CAPTURE", [fragment("selfie.binding")]), separatorBefore: "\n" },
    { ...baselineBlocks[1]!, separatorBefore: "\n\n\n" },
    group(german ? "AUFNAHME" : "CAPTURE", [fragment("selfie.capture")]),
    ...baselineBlocks.slice(3, -1),
    group(german ? "SELFIE-AUFNAHME" : "SELFIE CAPTURE", [fragment("selfie.geometry")]),
    ...baselineBlocks.slice(-1),
  ];
}

function singleReferenceBlocks(baselineBlocks: readonly TextLayoutBlock[], german: boolean): readonly TextLayoutBlock[] {
  return [
    ...baselineBlocks.slice(0, -1),
    group(german ? "EINZELNES REFERENZFOTO" : "SINGLE REFERENCE CAPTURE", [fragment("character.single-reference")]),
    ...baselineBlocks.slice(-1),
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

function germanBlocks(authorizedBranding: boolean): readonly TextLayoutBlock[] {
  return [
    staticBlock("BILDZIEL\nErzeuge eine natürliche, glaubwürdig fotografierte Lifestyleaufnahme einer realen erwachsenen Person."),
    group("PERSON", [fragment("character.subject")]),
    group("AUFNAHME", [
      fragment("camera.capture"),
      fragment("style.capture-character"),
      fragment("realism.body-mechanics"),
    ], " "),
    group("POSE, OUTFIT UND SZENE", [
      fragment("pose.action"),
      fragment("garment.outfit"),
      fragment("scene.environment"),
      fragment("lighting.capture"),
    ], " "),
    group("NATÜRLICHE DETAILS", [
      fragment("realism.skin"),
      fragment("realism.hair-details"),
      fragment("garment.material-behaviour"),
    ], " "),
    { ...group(undefined, [
      fragment("restrictions.capture-quality"),
      brandingFragment(authorizedBranding),
    ], " "), prefix: " " },
    group("GESICHTSMERKMALE", [fragment("character.facial-features")]),
    group("ADAPTIVE MATERIALPHYSIK", [fragment("material.physics")]),
    group("ADAPTIVER REALISMUS", [fragment("realism.adaptive")]),
    group("ADAPTIVER PHYSIKKONTEXT", [fragment("material.adaptive-physical-context")]),
    fragment("restrictions.additional-people", "\n\n"),
  ];
}

function englishBlocks(authorizedBranding: boolean): readonly TextLayoutBlock[] {
  return [
    staticBlock("IMAGE GOAL\nCreate a natural, credibly photographed lifestyle image of a real adult person."),
    group("SUBJECT", [fragment("character.subject")]),
    group("CAPTURE", [fragment("camera.capture")]),
    group("POSE, OUTFIT, AND SCENE", [
      fragment("pose.action"),
      fragment("garment.outfit"),
      fragment("garment.material-behaviour"),
      fragment("scene.environment"),
      fragment("scene.natural-details"),
      fragment("lighting.capture"),
      fragment("lighting.white-balance"),
    ], " "),
    group("NATURAL DETAIL", [fragment("realism.skin")]),
    { ...group(undefined, [
      fragment("restrictions.capture-quality"),
      brandingFragment(authorizedBranding),
    ], " "), prefix: " " },
    group("FACIAL FEATURES", [fragment("character.facial-features")]),
    group("SKIN AND CAPTURE APPEARANCE", [fragment("realism.capture-appearance")]),
    group("ADAPTIVE MATERIAL PHYSICS", [fragment("material.physics")]),
    group("ADAPTIVE REALISM", [fragment("realism.adaptive")]),
    group("ADAPTIVE PHYSICAL CONTEXT", [fragment("material.adaptive-physical-context")]),
    fragment("restrictions.additional-people", "\n\n"),
  ];
}

function staticBlock(text: string): TextLayoutBlock {
  return { kind: "heading", text };
}

function fragment(fragmentId: string, separatorBefore?: string): TextLayoutBlock {
  return { kind: "fragment", fragmentId, ...(separatorBefore === undefined ? {} : { separatorBefore }) };
}

function brandingFragment(authorized: boolean): TextLayoutBlock {
  return authorized
    ? fragment("restrictions.branding-authorized", "\n")
    : fragment("restrictions.branding");
}

function withExecutionContract(blocks: readonly TextLayoutBlock[]): readonly TextLayoutBlock[] {
  return [
    group("IMAGE GENERATION EXECUTION", [fragment("execution.image-generation")]),
    { ...staticBlock("===== IMAGE PROMPT ====="), separatorBefore: "\n\n" },
    ...(blocks.length === 0 ? [] : [{ ...blocks[0]!, separatorBefore: "\n\n" }, ...blocks.slice(1)]),
  ];
}

function group(
  heading: string | undefined,
  children: readonly TextLayoutBlock[],
  separatorBetweenChildren = "\n",
): TextLayoutBlock {
  return {
    kind: "group",
    ...(heading === undefined ? {} : { heading }),
    separatorBefore: "\n\n",
    separatorBetweenChildren,
    children,
  };
}
