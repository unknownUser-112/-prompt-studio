import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { characterSheetProvider } from "./rules";
import { characterSheetSection } from "./sections";

export const characterSheetPlugin: PromptStudioPlugin = {
  manifest: { id: "character-sheet", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["character-sheet"], requires: [] },
  register: (registrar) => { registrar.registerCapability("character-sheet"); registrar.registerConstraint({ id: characterSheetProvider.id, provider: characterSheetProvider }); registrar.registerPromptSection(characterSheetSection); registrar.registerDiagnostic({ id: "character-sheet.diagnostics" }); },
};
