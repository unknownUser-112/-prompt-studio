import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
export const modelBehaviourSection: PromptSectionProvider = { id: "model-behaviour", provide: () => "Model behaviour" };
