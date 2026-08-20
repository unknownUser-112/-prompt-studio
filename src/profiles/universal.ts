import type { ProfileLayout, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

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

export function createUniversalLayout(document: Readonly<PromptDocument>): ProfileLayout {
  const sectionsBySlot = new Map(document.sections.map((section) => [section.slotId, section]));
  const sections = UNIVERSAL_SLOT_ORDER.flatMap((slotId) => {
    const section = sectionsBySlot.get(slotId);
    return section === undefined ? [] : [{ section, slotId }];
  }).map(({ section, slotId }, order) => ({
    sectionId: section.id,
    order,
    separatorBefore: UNIVERSAL_SEPARATOR_BEFORE_BY_SLOT[slotId],
  }));
  const execution = document.sections.some((section) => section.fragments.some(({ id }) => id === "execution.image-generation"));
  return {
    id: PROFILE_IDS.universal,
    sections,
    ...(execution ? { textBlocks: withExecutionContract(sections.map((section) => ({ kind: "section" as const, sectionId: section.sectionId, separatorBefore: section.separatorBefore }))) } : {}),
  };
}

function withExecutionContract(blocks: readonly TextLayoutBlock[]): readonly TextLayoutBlock[] {
  return [
    { kind: "group", heading: "IMAGE GENERATION EXECUTION", children: [{ kind: "fragment", fragmentId: "execution.image-generation" }] },
    { kind: "heading", text: "===== IMAGE PROMPT =====", separatorBefore: "\n\n" },
    ...(blocks.length === 0 ? [] : [{ ...blocks[0]!, separatorBefore: "\n\n" }, ...blocks.slice(1)]),
  ];
}
