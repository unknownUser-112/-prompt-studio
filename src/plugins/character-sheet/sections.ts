import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";

export const characterSheetSection: PromptSectionProvider = { id: "character-sheet", provide: (state) => [createResolvedSectionDraft(state, "character-sheet", "Character sheet")] };
