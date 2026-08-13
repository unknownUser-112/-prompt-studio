import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
export const garmentSection: PromptSectionProvider = { id: "garment", provide: () => "Garment" };
