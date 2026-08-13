import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { brandProvider } from "./rules";
import { brandSection } from "./sections";
export const brandPlugin: PromptStudioPlugin = { manifest: { id: "brand", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["brand"], requires: [] }, register: (registrar) => { registrar.registerCapability("brand"); registrar.registerConstraint({ id: brandProvider.id, provider: brandProvider }); registrar.registerPromptSection(brandSection); registrar.registerDiagnostic({ id: "brand.diagnostics" }); } };
