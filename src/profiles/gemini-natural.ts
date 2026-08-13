import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createGeminiNaturalLayout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  const german = promptLanguage === "Deutsch";
  return {
    id: PROFILE_IDS.geminiNatural,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: german ? germanBlocks() : englishBlocks(),
  };
}

function germanBlocks(): readonly TextLayoutBlock[] {
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
      fragment("restrictions.branding"),
    ], " "), prefix: " " },
    group("GESICHTSMERKMALE", [fragment("character.facial-features")]),
    group("ADAPTIVE MATERIALPHYSIK", [fragment("material.physics")]),
    group("ADAPTIVER REALISMUS", [fragment("realism.adaptive")]),
    group("ADAPTIVER PHYSIKKONTEXT", [fragment("material.adaptive-physical-context")]),
    fragment("restrictions.additional-people", "\n\n"),
  ];
}

function englishBlocks(): readonly TextLayoutBlock[] {
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
      fragment("restrictions.branding"),
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
