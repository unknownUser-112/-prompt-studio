import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const CAPTURE_DE = "Ganzkörper, Kopf bis Fuß, beide Füße sichtbar. Eine einzige durchgehende Ganzkörperaufnahme; keine zusätzlichen Nahaufnahmen, Ausschnitte oder Wiederholungen derselben Person. Priorisiere vollständige Körperhaltung, beide Füße, Outfit und räumlichen Kontext. Haut- und Haardetails bleiben natürlich sichtbar, aber nicht als Nahaufnahme inszeniert. Aufgenommen mit einer modernes Smartphone-Kamerasystem und einem hauptkamera des Smartphones mit natürlicher Perspektive. natürlicher, authentischer fotografischer Charakter. natürliche Farbwiedergabe und ausgewogener Kontrast.";
const CAPTURE_EN = "full-body frame from head to toe with both feet visible. Use one continuous full-body frame only; do not add a portrait crop, close-up, alternate framing, or repeated view of the subject. Prioritize the complete pose, both feet, outfit, and environmental context. Skin and hair texture should remain naturally plausible at full-body viewing distance, not enlarged as a close-up. Captured with a modern smartphone camera system using a smartphone main camera with a natural perspective. The camera is at eye level. The shooting distance feels natural. Depth of field is subtle, and the shot feels calm and handheld. The framing should resemble a naturally captured smartphone photo rather than a carefully staged fashion campaign.";
const UPPER_BODY_DE = "Oberkörperaufnahme mit natürlichem Kameraabstand. Verwende nur einen einzigen durchgehenden Porträtrahmen, ohne Ganzkörperalternative, Vergleichsansicht oder wiederholte Person. Priorisiere Gesicht, Augen, Haut und Haardetails; füge keine Ganzkörperanforderungen hinzu. Aufgenommen mit einer modernes Smartphone-Kamerasystem und einem hauptkamera des Smartphones mit natürlicher Perspektive. natürlicher, authentischer fotografischer Charakter. natürliche Farbwiedergabe und ausgewogener Kontrast.";
const UPPER_BODY_EN = "upper-body frame with a natural camera distance. Use one continuous portrait frame only, without a full-body alternative, comparison view, or repeated subject. Prioritize the face, eyes, skin, and hair detail; do not add full-body framing requirements. Captured with a modern smartphone camera system using a smartphone main camera with a natural perspective. The camera is at eye level. The shooting distance feels natural. Depth of field is subtle, and the shot feels calm and handheld. The framing should resemble a naturally captured smartphone photo rather than a carefully staged fashion campaign.";
const OUTPUT_CONTRACT_DE = "Genau ein durchgehendes Foto. Die Hauptperson erscheint genau einmal und vollständig von Kopf bis Fuß; beide Füße sind sichtbar und kein Körperteil wird angeschnitten.\nKeine Collage, kein geteiltes Bild, kein Vergleich, keine alternative Aufnahme und keine Wiederholung der Hauptperson.";
const OUTPUT_CONTRACT_EN = "Exactly one continuous photograph. The primary subject appears exactly once and is fully visible from head to toe; both feet are visible and no body part is cropped.\nNo collage, split image, comparison, alternate take, duplicate primary subject, or repeated view.";
const UPPER_BODY_OUTPUT_CONTRACT_DE = "Genau ein durchgehendes Foto. Die Hauptperson erscheint genau einmal in einer Oberkörperaufnahme mit natürlichem Kameraabstand; keine Ganzkörperalternative, Vergleichsansicht oder Wiederholung der Hauptperson.\nKeine Collage, kein geteiltes Bild, kein Vergleich und keine alternative Aufnahme.";
const UPPER_BODY_OUTPUT_CONTRACT_EN = "Exactly one continuous photograph. The primary subject appears exactly once in an upper-body frame with a natural camera distance; no full-body alternative, comparison view, or repeated subject.\nNo collage, split image, comparison, or alternate take.";
const SELFIE_OUTPUT_CONTRACT_DE = "Genau ein durchgehendes Selfie. Die Hauptperson erscheint genau einmal in einer Aufnahme auf Armlänge; keine alternative Aufnahme, Vergleichsansicht oder Wiederholung der Hauptperson.\nKeine Collage und kein geteiltes Bild.";
const SELFIE_OUTPUT_CONTRACT_EN = "Exactly one continuous selfie. The primary subject appears exactly once in an arm-length capture; no alternate take, comparison view, or repeated subject.\nNo collage or split image.";

export const cameraSection: PromptSectionProvider = {
  id: "camera",
  provide: (state) => {
    const language = state.facts.values.promptLanguage;
    const german = language === "Deutsch";
    const framing = resolvedFraming(state.values);
    const capture = captureForFraming(framing, german);
    const outputContract = outputContractForFraming(framing, german);
    const capturePaths = ["camera.device", "camera.framing", "camera.lens", "camera.perspective", "camera.photoLook", "camera.style"] as const;
    const hasCompleteCapture = capturePaths.every((path) => state.trace.entries.some((entry) => entry.path === path));
    const fragments = hasCompleteCapture ? [
      createResolvedFragmentDraft(state, "camera", "camera.capture", capture, capturePaths),
      ...(outputContract === undefined ? [] : [
        createResolvedFragmentDraft(state, "camera", "camera.output-contract", outputContract, ["camera.framing"]),
      ]),
    ] : undefined;
    const heading = german ? "KAMERA / PERSPEKTIVE" : "CAMERA / PERSPECTIVE";
    return [createResolvedSectionDraft(state, "camera", `${heading}\n${capture}`, fragments)];
  },
};

function resolvedFraming(values: unknown): string {
  if (values === null || Array.isArray(values) || typeof values !== "object") throw new Error("Missing resolved camera.framing");
  const camera = (values as Readonly<Record<string, unknown>>).camera;
  if (camera === null || Array.isArray(camera) || typeof camera !== "object") throw new Error("Missing resolved camera.framing");
  const framing = (camera as Readonly<Record<string, unknown>>).framing;
  if (typeof framing !== "string" || framing.length === 0) throw new Error("Missing resolved camera.framing");
  return framing;
}

function captureForFraming(framing: string, german: boolean): string {
  if (framing === "framing.whole_person") return german ? CAPTURE_DE : CAPTURE_EN;
  if (framing === "framing.upper_body" || framing === "upper-body frame with a natural camera distance") {
    return german ? UPPER_BODY_DE : UPPER_BODY_EN;
  }
  return framing;
}

function outputContractForFraming(framing: string, german: boolean): string | undefined {
  if (framing === "framing.whole_person") return german ? OUTPUT_CONTRACT_DE : OUTPUT_CONTRACT_EN;
  if (framing === "framing.upper_body" || framing === "upper-body frame with a natural camera distance") {
    return german ? UPPER_BODY_OUTPUT_CONTRACT_DE : UPPER_BODY_OUTPUT_CONTRACT_EN;
  }
  if (framing === "arm-length selfie") return german ? SELFIE_OUTPUT_CONTRACT_DE : SELFIE_OUTPUT_CONTRACT_EN;
  return undefined;
}
