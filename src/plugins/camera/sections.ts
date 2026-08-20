import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const CAPTURE_DE = "Ganzkörper, Kopf bis Fuß, beide Füße sichtbar. Eine einzige durchgehende Ganzkörperaufnahme; keine zusätzlichen Nahaufnahmen, Ausschnitte oder Wiederholungen derselben Person. Priorisiere vollständige Körperhaltung, beide Füße, Outfit und räumlichen Kontext. Haut- und Haardetails bleiben natürlich sichtbar, aber nicht als Nahaufnahme inszeniert. Aufgenommen mit einer modernes Smartphone-Kamerasystem und einem hauptkamera des Smartphones mit natürlicher Perspektive. natürlicher, authentischer fotografischer Charakter. natürliche Farbwiedergabe und ausgewogener Kontrast.";
const CAPTURE_EN = "full-body frame from head to toe with both feet visible. Use one continuous full-body frame only; do not add a portrait crop, close-up, alternate framing, or repeated view of the subject. Prioritize the complete pose, both feet, outfit, and environmental context. Skin and hair texture should remain naturally plausible at full-body viewing distance, not enlarged as a close-up. Captured with a modern smartphone camera system using a smartphone main camera with a natural perspective. The camera is at eye level. The shooting distance feels natural. Depth of field is subtle, and the shot feels calm and handheld. The framing should resemble a naturally captured smartphone photo rather than a carefully staged fashion campaign.";
const WARM_CAPTURE_DE = "Ganzkörper, Kopf bis Fuß, beide Füße sichtbar. Eine einzige durchgehende Ganzkörperaufnahme; keine zusätzlichen Nahaufnahmen, Ausschnitte oder Wiederholungen derselben Person. Priorisiere vollständige Körperhaltung, beide Füße, Outfit und räumlichen Kontext. Haut- und Haardetails bleiben natürlich sichtbar, aber nicht als Nahaufnahme inszeniert. Aufgenommen mit einer modernes Smartphone-Kamerasystem und einem hauptkamera des Smartphones mit natürlicher Perspektive. natürlicher, authentischer fotografischer Charakter. warme Farbbalance mit sanften goldenen Tönen.";
const WARM_CAPTURE_EN = "full-body frame from head to toe with both feet visible. Use one continuous full-body frame only; do not add a portrait crop, close-up, alternate framing, or repeated view of the subject. Prioritize the complete pose, both feet, outfit, and environmental context. Skin and hair texture should remain naturally plausible at full-body viewing distance, not enlarged as a close-up. Captured with a modern smartphone camera system using a smartphone main camera with a natural perspective. The camera is at eye level. The shooting distance feels natural. Depth of field is subtle, and the shot feels calm and handheld. The framing should resemble a naturally captured smartphone photo rather than a carefully staged fashion campaign. Warm color balance with soft golden tones.";
const UPPER_BODY_DE = "Oberkörperaufnahme mit natürlichem Kameraabstand. Verwende nur einen einzigen durchgehenden Porträtrahmen, ohne Ganzkörperalternative, Vergleichsansicht oder wiederholte Person. Priorisiere Gesicht, Augen, Haut und Haardetails; füge keine Ganzkörperanforderungen hinzu. Aufgenommen mit einer modernes Smartphone-Kamerasystem und einem hauptkamera des Smartphones mit natürlicher Perspektive. natürlicher, authentischer fotografischer Charakter. natürliche Farbwiedergabe und ausgewogener Kontrast.";
const UPPER_BODY_EN = "upper-body frame with a natural camera distance. Use one continuous portrait frame only, without a full-body alternative, comparison view, or repeated subject. Prioritize the face, eyes, skin, and hair detail; do not add full-body framing requirements. Captured with a modern smartphone camera system using a smartphone main camera with a natural perspective. The camera is at eye level. The shooting distance feels natural. Depth of field is subtle, and the shot feels calm and handheld. The framing should resemble a naturally captured smartphone photo rather than a carefully staged fashion campaign.";
const OUTPUT_CONTRACT_DE = "Genau ein durchgehendes Foto. Die Hauptperson erscheint genau einmal und vollständig von Kopf bis Fuß; beide Füße sind sichtbar und kein Körperteil wird angeschnitten.\nKeine Collage, kein geteiltes Bild, kein Vergleich, keine alternative Aufnahme und keine Wiederholung der Hauptperson.";
const OUTPUT_CONTRACT_EN = "Exactly one continuous photograph. The primary subject appears exactly once and is fully visible from head to toe; both feet are visible and no body part is cropped.\nNo collage, split image, comparison, alternate take, duplicate primary subject, or repeated view.";
const GENERIC_OUTPUT_CONTRACT_DE = "Genau ein durchgehendes Foto, in dem die Hauptperson genau einmal erscheint und vollständig innerhalb des gewählten Bildausschnitts enthalten ist.\nKeine Collage, kein geteiltes Bild, kein Vergleich, keine alternative Aufnahme und keine Wiederholung der Hauptperson.";
const GENERIC_OUTPUT_CONTRACT_EN = "Exactly one continuous photograph with the primary subject appearing once and fully contained within the selected framing.\nNo collage, split image, comparison, alternate take, duplicate primary subject, or repeated view.";
const MULTI_WHOLE_PERSON_OUTPUT_CONTRACT_DE = "Genau ein durchgehendes Foto. Beide Erwachsenen erscheinen jeweils genau einmal und sind im selben Bild vollständig von Kopf bis Fuß sichtbar; alle vier Füße sind sichtbar und keine Person wird angeschnitten. Platziere die Kamera weit genug entfernt, damit beide vollständigen Körper aus einem einzigen Kameraabstand ins Bild passen.\nKeine Collage, kein geteiltes Bild, kein Vergleich, keine alternative Aufnahme und keine Wiederholung der Hauptperson.";
const MULTI_WHOLE_PERSON_OUTPUT_CONTRACT_EN = "Exactly one continuous photograph. Both adults appear exactly once and are fully visible from head to toe in the same frame; all four feet are visible and neither person is cropped. Place the camera far enough back to fit both complete bodies at one camera distance.\nNo collage, split image, comparison, alternate take, duplicate primary subject, or repeated view.";
const MULTI_GENERIC_OUTPUT_CONTRACT_DE = "Genau ein durchgehendes Foto mit genau zwei Erwachsenen, die jeweils einmal erscheinen und vollständig innerhalb des gewählten Bildausschnitts enthalten sind; schneide keine Person und kein Gesicht am Bildrand an.\nKeine Collage, kein geteiltes Bild, kein Vergleich, keine alternative Aufnahme und keine Wiederholung der Hauptperson.";
const MULTI_GENERIC_OUTPUT_CONTRACT_EN = "Exactly one continuous photograph with exactly two adults, each appearing once and fully contained within the selected framing; do not crop either person or either face at the image edge.\nNo collage, split image, comparison, alternate take, duplicate primary subject, or repeated view.";
const COMPACT_CAPTURE_EN = "Capture with a modern smartphone camera system using a smartphone main camera with a natural perspective; at eye level, natural shooting distance, and subtle depth of field.";
const COMPACT_CAPTURE_DE = "einer modernes Smartphone-Kamerasystem mit hauptkamera des Smartphones mit natürlicher Perspektive; auf Augenhöhe, natürlicher Aufnahmeabstand, dezente Tiefenschärfe. zurückhaltendes Smartphone-HDR. leichte rechnerische Schärfung";
const COMPACT_WARM_CAPTURE_DE = "einer modernes Smartphone-Kamerasystem mit hauptkamera des Smartphones mit natürlicher Perspektive; auf Augenhöhe, natürlicher Aufnahmeabstand, dezente Tiefenschärfe. ausgewogene, zurückhaltende Smartphone-HDR-Verarbeitung. klare, aber nicht überschärfte rechnerische Detailzeichnung";

export const cameraSection: PromptSectionProvider = {
  id: "camera",
  provide: (state) => {
    const language = state.facts.values.promptLanguage;
    const german = language === "Deutsch";
    const framing = resolvedFraming(state.values);
    const additionalPerson = nestedValue(state.values, "scene", "additionalPerson") === true;
    const photoLook = resolvedCameraString(state.values, "photoLook");
    const capture = captureForFraming(framing, photoLook, german);
    const selectedFraming = selectedFramingForResolvedValue(framing, german);
    const outputContract = outputContractForFraming(framing, additionalPerson, german);
    const outputContractPaths = additionalPerson
      ? ["camera.framing", "scene.additionalPerson"] as const
      : ["camera.framing"] as const;
    const capturePaths = ["camera.device", "camera.framing", "camera.lens", "camera.perspective", "camera.photoLook", "camera.style"] as const;
    const compactCapturePaths = ["camera.device", "camera.lens", "camera.perspective", "camera.photoLook", "camera.style"] as const;
    const hasCompleteCapture = capturePaths.every((path) => state.trace.entries.some((entry) => entry.path === path));
    const fragments = hasCompleteCapture ? [
      createResolvedFragmentDraft(state, "camera", "camera.capture", capture, capturePaths),
      createResolvedFragmentDraft(
        state,
        "camera",
        "camera.compact-capture",
        compactCaptureForResolvedValue(photoLook, german),
        compactCapturePaths,
      ),
      createResolvedFragmentDraft(state, "camera", "camera.selected-framing", selectedFraming, ["camera.framing"]),
      ...(outputContract === undefined ? [] : [
        createResolvedFragmentDraft(state, "camera", "camera.output-contract", outputContract, outputContractPaths),
      ]),
    ] : undefined;
    const heading = german ? "KAMERA / PERSPEKTIVE" : "CAMERA / PERSPECTIVE";
    return [createResolvedSectionDraft(state, "camera", `${heading}\n${capture}`, fragments)];
  },
};

function resolvedFraming(values: unknown): string {
  return resolvedCameraString(values, "framing");
}

function resolvedCameraString(values: unknown, field: string): string {
  if (values === null || Array.isArray(values) || typeof values !== "object") throw new Error("Missing resolved camera.framing");
  const camera = (values as Readonly<Record<string, unknown>>).camera;
  if (camera === null || Array.isArray(camera) || typeof camera !== "object") throw new Error("Missing resolved camera.framing");
  const value = (camera as Readonly<Record<string, unknown>>)[field];
  if (typeof value !== "string" || value.length === 0) throw new Error(`Missing resolved camera.${field}`);
  return value;
}

function captureForFraming(framing: string, photoLook: string, german: boolean): string {
  if (framing === "framing.whole_person") {
    if (photoLook === "photoLook.warm") return german ? WARM_CAPTURE_DE : WARM_CAPTURE_EN;
    return german ? CAPTURE_DE : CAPTURE_EN;
  }
  if (framing === "framing.upper_body" || framing === "upper-body frame with a natural camera distance") {
    return german ? UPPER_BODY_DE : UPPER_BODY_EN;
  }
  return framing;
}

function selectedFramingForResolvedValue(framing: string, german: boolean): string {
  if (framing === "framing.whole_person") {
    return german ? "Ganzkörper, Kopf bis Fuß, beide Füße sichtbar" : "full-body frame from head to toe with both feet visible";
  }
  if (framing === "framing.upper_body" || framing === "upper-body frame with a natural camera distance") {
    return german ? "Oberkörperaufnahme mit natürlichem Kameraabstand" : "upper-body frame with a natural camera distance";
  }
  if (framing === "arm-length selfie") return german ? "Selfie-Aufnahme auf Armlänge" : "arm-length selfie";
  return framing;
}

function compactCaptureForResolvedValue(photoLook: string, german: boolean): string {
  if (!german) return COMPACT_CAPTURE_EN;
  return photoLook === "photoLook.warm" ? COMPACT_WARM_CAPTURE_DE : COMPACT_CAPTURE_DE;
}

function outputContractForFraming(framing: string, additionalPerson: boolean, german: boolean): string | undefined {
  if (additionalPerson && framing === "framing.whole_person") {
    return german ? MULTI_WHOLE_PERSON_OUTPUT_CONTRACT_DE : MULTI_WHOLE_PERSON_OUTPUT_CONTRACT_EN;
  }
  if (additionalPerson) return german ? MULTI_GENERIC_OUTPUT_CONTRACT_DE : MULTI_GENERIC_OUTPUT_CONTRACT_EN;
  if (framing === "framing.whole_person") return german ? OUTPUT_CONTRACT_DE : OUTPUT_CONTRACT_EN;
  if (framing === "framing.upper_body" || framing === "upper-body frame with a natural camera distance" || framing === "arm-length selfie") {
    return german ? GENERIC_OUTPUT_CONTRACT_DE : GENERIC_OUTPUT_CONTRACT_EN;
  }
  return undefined;
}

function nestedValue(value: unknown, first: string, second: string): unknown {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const nested = (value as Readonly<Record<string, unknown>>)[first];
  if (nested === null || Array.isArray(nested) || typeof nested !== "object") return undefined;
  return (nested as Readonly<Record<string, unknown>>)[second];
}
