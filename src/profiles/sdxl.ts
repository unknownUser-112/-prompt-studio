import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { createFluxContentBlocks, withFluxExecutionContract } from "./flux";
import { PROFILE_IDS } from "./profile-ids";

type PromptLanguage = "Deutsch" | "English" | string;

export function createSdxlLayout(
  document: Readonly<PromptDocument>,
  promptLanguage: PromptLanguage,
): ProfileLayout {
  const referenceSheet = hasFragment(document, "character.reference-sheet");
  const execution = hasFragment(document, "execution.image-generation");
  const fluxBlocks = createFluxContentBlocks(document, promptLanguage);
  const blocks = referenceSheet ? fluxBlocks : withSdxlChannels(document, fluxBlocks);
  return {
    id: PROFILE_IDS.sdxl,
    sections: document.sections.map((section, order) => ({ sectionId: section.id, order })),
    textBlocks: execution ? withFluxExecutionContract(blocks) : blocks,
  };
}

function withSdxlChannels(
  document: Readonly<PromptDocument>,
  fluxBlocks: readonly TextLayoutBlock[],
): readonly TextLayoutBlock[] {
  const primary = fluxBlocks[0];
  if (primary === undefined) return [];
  const authorizedBranding = hasFragment(document, "restrictions.negative-prompt-authorized");
  return [
    group("POSITIVE PROMPT", [primary], "", ""),
    group("NEGATIVE PROMPT", [fragment(authorizedBranding
      ? "restrictions.negative-prompt-authorized"
      : "restrictions.negative-prompt")]),
    ...fluxBlocks.slice(1),
  ];
}

function hasFragment(document: Readonly<PromptDocument>, id: string): boolean {
  return document.sections.some((section) => section.fragments.some((fragmentDraft) => fragmentDraft.id === id));
}

function fragment(fragmentId: string): TextLayoutBlock {
  return { kind: "fragment", fragmentId };
}

function group(
  heading: string,
  children: readonly TextLayoutBlock[],
  separatorBetweenChildren = "\n",
  separatorBefore = "\n\n",
): TextLayoutBlock {
  return { kind: "group", heading, separatorBefore, separatorBetweenChildren, children };
}
