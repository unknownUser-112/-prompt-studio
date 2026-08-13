import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";

export const characterSheetSection: PromptSectionProvider = { id: "character-sheet", provide: () => "Character sheet" };
