import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";
export const brandSection: PromptSectionProvider = { id: "brand", provide: (state) => [createResolvedSectionDraft(state, "brand", "Brand restrictions")] };
