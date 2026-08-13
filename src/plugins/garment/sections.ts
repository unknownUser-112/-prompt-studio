import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const garmentSection: PromptSectionProvider = { id: "garment", provide: (state) => [createResolvedSectionDraft(state, "garment", "Garment")] };
