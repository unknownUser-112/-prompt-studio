import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const additionalPersonSection: PromptSectionProvider = { id: "additional-person", provide: (state) => [createResolvedSectionDraft(state, "additional-person", "Additional person")] };
