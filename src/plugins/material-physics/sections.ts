import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../domain/contracts/prompt/providers";
export const materialPhysicsSection: PromptSectionProvider = { id: "material-physics", provide: (state) => [createResolvedSectionDraft(state, "material-physics", "Material physics")] };
