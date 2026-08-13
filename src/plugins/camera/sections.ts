import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
export const cameraSection: PromptSectionProvider = { id: "camera", provide: () => "Camera" };
