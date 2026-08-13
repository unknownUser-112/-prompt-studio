import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";
export const selfieSection: PromptSectionProvider = { id: "selfie", provide: (state) => [createResolvedSectionDraft(state, "selfie", "Selfie binding")] };
