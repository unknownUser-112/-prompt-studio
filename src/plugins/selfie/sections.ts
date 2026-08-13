import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const selfieSection: PromptSectionProvider = { id: "selfie", provide: (state) => [createResolvedSectionDraft(state, "selfie", "Selfie binding")] };
