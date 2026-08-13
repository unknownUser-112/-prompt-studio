import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { additionalPersonProvider } from "./rules";
import { additionalPersonSection } from "./sections";
export const additionalPersonPlugin: PromptStudioPlugin = { manifest: { id: "additional-person", version: "1.0.0", apiVersion: "1.0.0", required: true, provides: ["additional-person"], requires: [] }, register: (registrar) => { registrar.registerCapability("additional-person"); registrar.registerConstraint({ id: additionalPersonProvider.id, provider: additionalPersonProvider }); registrar.registerPromptSection(additionalPersonSection); registrar.registerDiagnostic({ id: "additional-person.diagnostics" }); } };
