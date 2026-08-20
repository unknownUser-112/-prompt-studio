import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createGeminiProLayout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  const german = promptLanguage === "Deutsch";
  const authorizedBranding = document.sections.some((section) => section.fragments.some(({ id }) => id === "restrictions.branding-authorized"));
  return {
    id: PROFILE_IDS.geminiPro,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: german ? germanBlocks(authorizedBranding) : englishBlocks(authorizedBranding),
  };
}

function germanBlocks(authorizedBranding: boolean): readonly TextLayoutBlock[] {
  return [
    heading("IMAGE GOAL\nErzeuge eine authentische, unbearbeitet wirkende Aufnahme einer realen erwachsenen Person. Das Ergebnis soll wie ein glaubwürdig entstandenes Lifestylefoto wirken, nicht wie ein digitales Rendering."),
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
    fragment("restrictions.additional-people", "\n\n"),
  ];
}

function englishBlocks(authorizedBranding: boolean): readonly TextLayoutBlock[] {
  return [
    heading("IMAGE GOAL\nCreate an authentic, unretouched-looking photograph of a real adult person. The result should feel like a genuinely captured lifestyle photograph, not a digital rendering."),
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
      fragment("restrictions.additional-people"),
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

function group(
  headingText: string,
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
