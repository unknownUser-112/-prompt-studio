import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { adaptiveRealismProvider } from "./rules";
import { adaptiveRealismSection } from "./sections";
export const adaptiveRealismPlugin: PromptStudioPlugin = { manifest: { id: "adaptive-realism", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["adaptive-realism"], requires: [] }, register: (registrar) => { registrar.registerCapability("adaptive-realism"); registrar.registerConstraint({ id: adaptiveRealismProvider.id, provider: adaptiveRealismProvider }); registrar.registerPromptSection(adaptiveRealismSection); registrar.registerDiagnostic({ id: "adaptive-realism.diagnostics" }); } };
