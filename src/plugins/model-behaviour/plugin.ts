import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { modelBehaviourProvider } from "./rules";
import { modelBehaviourSection } from "./sections";
export const modelBehaviourPlugin: PromptStudioPlugin = { manifest: { id: "model-behaviour", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["model-behaviour"], requires: [] }, register: (registrar) => { registrar.registerCapability("model-behaviour"); registrar.registerConstraint({ id: modelBehaviourProvider.id, provider: modelBehaviourProvider }); registrar.registerPromptSection(modelBehaviourSection); registrar.registerDiagnostic({ id: "model-behaviour.diagnostics" }); } };
