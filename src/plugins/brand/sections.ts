import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
export const brandSection: PromptSectionProvider = { id: "brand", provide: () => "Brand restrictions" };
