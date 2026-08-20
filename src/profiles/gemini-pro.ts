import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createGeminiProLayout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  const german = promptLanguage === "Deutsch";
  const referenceSheet = hasFragment(document, "character.reference-sheet");
  const singleReference = hasFragment(document, "character.single-reference");
  const selfie = hasFragment(document, "selfie.binding");
  const additionalPerson = hasFragment(document, "additional-person.person");
  const openGarment = hasFragment(document, "garment.state");
  const openOrganza = openGarment && hasFragment(document, "garment.outfit-build");
  const authorizedBranding = document.sections.some((section) => section.fragments.some(({ id }) => id === "restrictions.branding-authorized"));
  const execution = document.sections.some((section) => section.fragments.some(({ id }) => id === "execution.image-generation"));
  const baselineBlocks = german
    ? germanBlocks(authorizedBranding, additionalPerson)
    : englishBlocks(authorizedBranding, additionalPerson);
  const modeBlocks = referenceSheet
    ? referenceSheetBlocks(german)
    : singleReference
      ? singleReferenceBlocks(baselineBlocks, german)
      : selfie
        ? selfieBlocks(baselineBlocks, german)
        : baselineBlocks;
  const garmentBlocks = openGarment ? openGarmentBlocks(modeBlocks, german, openOrganza, selfie) : modeBlocks;
  const blocks = additionalPerson ? additionalPersonBlocks(garmentBlocks, german) : garmentBlocks;
  return {
    id: PROFILE_IDS.geminiPro,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: execution ? withExecutionContract(blocks) : blocks,
  };
}

function additionalPersonBlocks(blocks: readonly TextLayoutBlock[], german: boolean): readonly TextLayoutBlock[] {
  const restrictionsIndex = blocks.findIndex((block) => block.kind === "group" && block.heading === "RESTRICTIONS");
  if (restrictionsIndex < 0) return blocks;
  return [
    ...blocks.slice(0, restrictionsIndex),
    group(german ? "ZUSÄTZLICHE PERSON" : "ADDITIONAL PERSON", [fragment("additional-person.person")]),
    { ...blocks[restrictionsIndex]!, separatorBefore: "\n" },
    ...blocks.slice(restrictionsIndex + 1),
  ];
}

function selfieBlocks(blocks: readonly TextLayoutBlock[], german: boolean): readonly TextLayoutBlock[] {
  return [
    blocks[0]!,
    { ...group(german ? "VERBINDLICHE SELFIE-AUFNAHME" : "BINDING SELFIE CAPTURE", [fragment("selfie.binding")]), separatorBefore: "\n" },
    { ...blocks[1]!, separatorBefore: "\n\n\n" },
    group("COMPOSITION AND CAMERA", [fragment("selfie.capture")]),
    ...blocks.slice(3, 10),
    group(german ? "SELFIE-AUFNAHME" : "SELFIE CAPTURE", [fragment("selfie.geometry")]),
    { ...blocks[10]!, separatorBefore: "\n" },
    ...blocks.slice(11),
  ];
}

function openGarmentBlocks(blocks: readonly TextLayoutBlock[], german: boolean, organza: boolean, selfie: boolean): readonly TextLayoutBlock[] {
  const state = { ...group(german ? "VERBINDLICHER KLEIDUNGSZUSTAND" : "BINDING GARMENT STATE", [fragment("garment.state")]), separatorBefore: "\n" };
  if (organza) {
    return [
      ...blocks.slice(0, 4),
      state,
      { ...blocks[4]!, separatorBefore: "\n\n\n" },
      ...blocks.slice(5),
      { ...group(german ? "OBERKÖRPER-SCHICHTREGEL" : "UPPER-BODY LAYER RULE", [fragment("garment.upper-body"), fragment("garment.layering")], " "), separatorBefore: "\n\n" },
    ];
  }
  const outfitIndex = selfie ? 5 : 4;
  return [
    ...blocks.slice(0, outfitIndex),
    state,
    { ...group("OUTFIT AND MATERIALS", [
      group(german ? "OBERKÖRPER-SCHICHTVERTRAG" : "UPPER-BODY LAYER CONTRACT", [fragment("garment.upper-body"), fragment("garment.layering")], " "),
      { ...group(undefined, [fragment("garment.outfit"), fragment("garment.material-behaviour")], " "), separatorBefore: "\n" },
    ]), separatorBefore: "\n\n\n" },
    ...blocks.slice(outfitIndex + 1),
  ];
}

function hasFragment(document: Readonly<PromptDocument>, fragmentId: string): boolean {
  return document.sections.some((section) => section.fragments.some(({ id }) => id === fragmentId));
}

function singleReferenceBlocks(blocks: readonly TextLayoutBlock[], german: boolean): readonly TextLayoutBlock[] {
  const reference = group(german ? "EINZELNES REFERENZFOTO" : "SINGLE REFERENCE CAPTURE", [fragment("character.single-reference")]);
  return german
    ? [...blocks.slice(0, -1), reference, ...blocks.slice(-1)]
    : [...blocks, reference];
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

function germanBlocks(authorizedBranding: boolean, additionalPerson: boolean): readonly TextLayoutBlock[] {
  return [
    imageGoalBlock(true, additionalPerson),
    group("SUBJECT IDENTITY", [fragment("character.subject"), fragment("character.identity-consistency")], " "),
    group("COMPOSITION AND CAMERA", [
      fragment("camera.capture"),
      fragment("style.capture-character"),
      fragment("realism.body-mechanics"),
    ], " "),
    group("POSE AND EXPRESSION", [fragment("pose.action")]),
    group("OUTFIT AND MATERIALS", [
      fragment("garment.outfit"),
      fragment("garment.outfit-build"),
      fragment("garment.material-behaviour"),
      fragment("garment.material-consistency"),
    ], " "),
    group("LOCATION AND LIGHT", [
      fragment("scene.environment"),
      fragment("scene.natural-details"),
      fragment("lighting.coordination"),
      fragment("scene.surface-details"),
      fragment("lighting.capture"),
      fragment("lighting.white-balance"),
      fragment("lighting.source-consistency"),
    ], " "),
    group("NATURAL HUMAN DETAIL", [
      fragment("realism.skin"),
      fragment("realism.hair-details"),
      fragment("realism.natural-irregularity"),
    ], " "),
    group("PHOTOGRAPHIC CHARACTER", [fragment("realism.photographic-character")]),
    group("GESICHTSMERKMALE", [fragment("character.facial-features")]),
    group("RESTRICTIONS", [fragment("restrictions.capture-quality-detailed"), brandingFragment(authorizedBranding)], " "),
    group("ADAPTIVE MATERIALPHYSIK", [fragment("material.physics")]),
    group("ADAPTIVER REALISMUS", [fragment("realism.adaptive")]),
    group("ADAPTIVER PHYSIKKONTEXT", [fragment("material.adaptive-physical-context")]),
    additionalPersonRestriction(additionalPerson, "\n\n"),
  ];
}

function englishBlocks(authorizedBranding: boolean, additionalPerson: boolean): readonly TextLayoutBlock[] {
  return [
    imageGoalBlock(false, additionalPerson),
    group("SUBJECT IDENTITY", [fragment("character.subject"), fragment("character.identity-consistency")], " "),
    group("COMPOSITION AND CAMERA", [fragment("camera.capture")]),
    group("POSE AND EXPRESSION", [fragment("pose.action")]),
    group("OUTFIT AND MATERIALS", [fragment("garment.outfit"), fragment("garment.material-behaviour")], " "),
    group("LOCATION AND LIGHT", [
      fragment("scene.environment"),
      fragment("scene.natural-details"),
      fragment("lighting.capture"),
      fragment("lighting.white-balance"),
      fragment("lighting.source-consistency"),
    ], " "),
    group("NATURAL HUMAN DETAIL", [fragment("realism.skin")]),
    group("PHOTOGRAPHIC CHARACTER", [fragment("realism.photographic-character")]),
    group("FACIAL FEATURES", [fragment("character.facial-features")]),
    group("SKIN AND CAPTURE APPEARANCE", [fragment("realism.capture-appearance")]),
    group("RESTRICTIONS", [
      additionalPersonRestriction(additionalPerson),
      fragment("restrictions.capture-quality-detailed"),
      brandingFragment(authorizedBranding),
    ], " "),
    group("ADAPTIVE MATERIAL PHYSICS", [fragment("material.physics")]),
    group("ADAPTIVE REALISM", [fragment("realism.adaptive")]),
    group("ADAPTIVE PHYSICAL CONTEXT", [fragment("material.adaptive-physical-context")]),
  ];
}

function heading(text: string): TextLayoutBlock {
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

function imageGoalBlock(german: boolean, additionalPerson: boolean): TextLayoutBlock {
  if (additionalPerson) return group("IMAGE GOAL", [fragment("image-goal.two-adults")]);
  return heading(german
    ? "IMAGE GOAL\nErzeuge eine authentische, unbearbeitet wirkende Aufnahme einer realen erwachsenen Person. Das Ergebnis soll wie ein glaubwürdig entstandenes Lifestylefoto wirken, nicht wie ein digitales Rendering."
    : "IMAGE GOAL\nCreate an authentic, unretouched-looking photograph of a real adult person. The result should feel like a genuinely captured lifestyle photograph, not a digital rendering.");
}

function additionalPersonRestriction(authorized: boolean, separatorBefore?: string): TextLayoutBlock {
  return fragment(
    authorized ? "restrictions.additional-people-authorized" : "restrictions.additional-people",
    separatorBefore,
  );
}

function withExecutionContract(blocks: readonly TextLayoutBlock[]): readonly TextLayoutBlock[] {
  return [
    group("IMAGE GENERATION EXECUTION", [fragment("execution.image-generation")]),
    { ...heading("===== IMAGE PROMPT ====="), separatorBefore: "\n\n" },
    ...(blocks.length === 0 ? [] : [{ ...blocks[0]!, separatorBefore: "\n\n" }, ...blocks.slice(1)]),
  ];
}

function group(
  headingText: string | undefined,
  children: readonly TextLayoutBlock[],
  separatorBetweenChildren = "\n",
): TextLayoutBlock {
  return {
    kind: "group",
    heading: headingText,
    separatorBefore: "\n\n",
    separatorBetweenChildren,
    children,
  };
}
