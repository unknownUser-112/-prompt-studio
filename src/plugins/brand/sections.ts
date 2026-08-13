import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const brandSection: PromptSectionProvider = { id: "brand", provide: (state) => [createResolvedSectionDraft(state, "brand", "Brand restrictions")] };
