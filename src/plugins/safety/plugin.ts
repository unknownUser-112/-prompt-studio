import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { safetyProvider } from "./rules";
import { safetySection } from "./sections";
export const safetyPlugin: PromptStudioPlugin = { manifest: { id: "safety", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["safety"], requires: [] }, register: (registrar) => { registrar.registerCapability("safety"); registrar.registerConstraint({ id: safetyProvider.id, provider: safetyProvider }); registrar.registerPromptSection(safetySection); registrar.registerDiagnostic({ id: "safety.diagnostics" }); } };
