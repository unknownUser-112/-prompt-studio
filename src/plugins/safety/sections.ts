import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const safetySection: PromptSectionProvider = { id: "safety", provide: (state) => [createResolvedSectionDraft(state, "safety", "Safety")] };
