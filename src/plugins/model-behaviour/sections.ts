import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const modelBehaviourSection: PromptSectionProvider = { id: "model-behaviour", provide: (state) => [createResolvedSectionDraft(state, "model-behaviour", "Model behaviour")] };
