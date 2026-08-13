import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { cameraProvider } from "./rules";
import { cameraSection } from "./sections";
export const cameraPlugin: PromptStudioPlugin = { manifest: { id: "camera", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["camera"], requires: [] }, register: (registrar) => { registrar.registerCapability("camera"); registrar.registerConstraint({ id: cameraProvider.id, provider: cameraProvider }); registrar.registerPromptSection(cameraSection); registrar.registerDiagnostic({ id: "camera.diagnostics" }); } };
