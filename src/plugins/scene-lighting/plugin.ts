import type { PromptStudioPlugin } from "../../contracts/plugins/plugin-manifest";
import { sceneLightingProvider } from "./rules";
import { sceneLightingSection } from "./sections";

export const sceneLightingPlugin: PromptStudioPlugin = {
  manifest: {
    id: "scene-lighting",
    version: "1.0.0",
    apiVersion: "1.0.0",
    required: true,
    provides: ["scene-lighting"],
    requires: [],
  },
  register: (registrar) => {
    registrar.registerCapability("scene-lighting");
    registrar.registerConstraint({ id: sceneLightingProvider.id, provider: sceneLightingProvider });
    registrar.registerPromptSection(sceneLightingSection);
    registrar.registerDiagnostic({ id: "scene-lighting.diagnostics" });
  },
};
