import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
export const selfieSection: PromptSectionProvider = { id: "selfie", provide: () => "Selfie binding" };
