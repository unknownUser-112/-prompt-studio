import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
export const additionalPersonSection: PromptSectionProvider = { id: "additional-person", provide: () => "Additional person" };
