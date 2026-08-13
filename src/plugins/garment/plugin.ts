import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { garmentProvider } from "./rules";
import { garmentSection } from "./sections";
export const garmentPlugin: PromptStudioPlugin = { manifest: { id: "garment", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["garment"], requires: [] }, register: (registrar) => { registrar.registerCapability("garment"); registrar.registerConstraint({ id: garmentProvider.id, provider: garmentProvider }); registrar.registerPromptSection(garmentSection); registrar.registerDiagnostic({ id: "garment.diagnostics" }); } };
