import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const adaptiveRealismSection: PromptSectionProvider = { id: "adaptive-realism", provide: (state) => [createResolvedSectionDraft(state, "adaptive-realism", "Adaptive realism")] };
