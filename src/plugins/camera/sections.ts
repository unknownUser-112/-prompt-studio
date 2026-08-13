import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const CAPTURE_DE = "Ganzkörper, Kopf bis Fuß, beide Füße sichtbar. Eine einzige durchgehende Ganzkörperaufnahme; keine zusätzlichen Nahaufnahmen, Ausschnitte oder Wiederholungen derselben Person. Priorisiere vollständige Körperhaltung, beide Füße, Outfit und räumlichen Kontext. Haut- und Haardetails bleiben natürlich sichtbar, aber nicht als Nahaufnahme inszeniert. Aufgenommen mit einer modernes Smartphone-Kamerasystem und einem hauptkamera des Smartphones mit natürlicher Perspektive. natürlicher, authentischer fotografischer Charakter. natürliche Farbwiedergabe und ausgewogener Kontrast.";
const CAPTURE_EN = "full-body frame from head to toe with both feet visible. Use one continuous full-body frame only; do not add a portrait crop, close-up, alternate framing, or repeated view of the subject. Prioritize the complete pose, both feet, outfit, and environmental context. Skin and hair texture should remain naturally plausible at full-body viewing distance, not enlarged as a close-up. Captured with a modern smartphone camera system using a smartphone main camera with a natural perspective. The camera is at eye level. The shooting distance feels natural. Depth of field is subtle, and the shot feels calm and handheld. The framing should resemble a naturally captured smartphone photo rather than a carefully staged fashion campaign.";
const BASELINE_DE = `KAMERA / PERSPEKTIVE\n${CAPTURE_DE}`;
const BASELINE_EN = `CAMERA / PERSPECTIVE\n${CAPTURE_EN}`;

export const cameraSection: PromptSectionProvider = {
  id: "camera",
  provide: (state) => {
    const language = state.facts.values.promptLanguage;
    const german = language === "Deutsch";
    const capturePaths = ["camera.device", "camera.framing", "camera.lens", "camera.perspective", "camera.photoLook", "camera.style"] as const;
    const hasCompleteCapture = capturePaths.every((path) => state.trace.entries.some((entry) => entry.path === path));
    const fragments = hasCompleteCapture ? [createResolvedFragmentDraft(
      state,
      "camera",
      "camera.capture",
      german ? CAPTURE_DE : CAPTURE_EN,
      capturePaths,
    )] : undefined;
    return [createResolvedSectionDraft(state, "camera", german ? BASELINE_DE : BASELINE_EN, fragments)];
  },
};
