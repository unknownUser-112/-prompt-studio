import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";
export const safetySection: PromptSectionProvider = { id: "safety", provide: (state) => [createResolvedSectionDraft(state, "safety", "Safety")] };
