import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { selfieProvider } from "./rules";
import { selfieSection } from "./sections";
export const selfiePlugin: PromptStudioPlugin = { manifest: { id: "selfie", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["selfie"], requires: [] }, register: (registrar) => { registrar.registerCapability("selfie"); registrar.registerConstraint({ id: selfieProvider.id, provider: selfieProvider }); registrar.registerPromptSection(selfieSection); registrar.registerDiagnostic({ id: "selfie.diagnostics" }); } };
