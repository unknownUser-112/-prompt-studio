import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
export const safetySection: PromptSectionProvider = { id: "safety", provide: () => "Safety" };
