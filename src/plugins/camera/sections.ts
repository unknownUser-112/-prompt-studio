import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const cameraSection: PromptSectionProvider = { id: "camera", provide: (state) => [createResolvedSectionDraft(state, "camera", "Camera")] };
