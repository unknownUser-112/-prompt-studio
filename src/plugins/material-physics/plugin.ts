import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { materialPhysicsProvider } from "./rules";
import { materialPhysicsSection } from "./sections";
export const materialPhysicsPlugin: PromptStudioPlugin = { manifest: { id: "material-physics", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["material-physics"], requires: [] }, register: (registrar) => { registrar.registerCapability("material-physics"); registrar.registerConstraint({ id: materialPhysicsProvider.id, provider: materialPhysicsProvider }); registrar.registerPromptSection(materialPhysicsSection); registrar.registerDiagnostic({ id: "material-physics.diagnostics" }); } };
