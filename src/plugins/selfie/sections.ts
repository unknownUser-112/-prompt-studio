import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BINDING_DE = "Dieses Foto wird von der Hauptperson selbst mit der Smartphone-Frontkamera aus plausibler Armlängendistanz aufgenommen. Ein haltender Arm erstreckt sich anatomisch zur Kamera; Kameraposition, Schulter, Arm und Blickrichtung bilden eine konsistente Selfie-Geometrie. Verwende eine leichte, realistische Weitwinkelperspektive der Frontkamera. Es gibt keine externe fotografierende Person. Interpretiere dies nicht als Foto, das von einer anderen Person aufgenommen wurde.";
const BINDING_EN = "This photograph is taken by the primary subject herself using the smartphone front camera at a plausible arm-length distance. One holding arm extends anatomically toward the camera; camera position, shoulder, arm, and gaze direction form one consistent selfie geometry. Use mild, realistic front-camera wide-angle perspective. There is no external photographer. Do not reinterpret this as a photograph taken by another person.";
const CAPTURE_DE = "Oberkörperaufnahme mit natürlichem Kameraabstand. Verwende nur einen einzigen durchgehenden Porträtrahmen, ohne Ganzkörperalternative, Vergleichsansicht oder wiederholte Person. Priorisiere Gesicht, Augen, Haut und Haardetails; füge keine Ganzkörperanforderungen hinzu. Ein handgehaltenes Frontkamera-Selfie aus plausibler Armlängendistanz mit leichter, realistischer Weitwinkelperspektive der Frontkamera. Die erwachsene Person passt natürlich in den Bildrahmen; es gibt keine externe fotografierende Person.";
const CAPTURE_EN = "upper-body frame with a natural camera distance. Use one continuous portrait frame only, without a full-body alternative, comparison view, or repeated subject. Prioritize the face, eyes, skin, and hair detail; do not add full-body framing requirements. A handheld front-camera selfie at a plausible arm-length distance with mild, realistic front-camera wide-angle perspective. The adult subject fits naturally within the frame; there is no external photographer.";
const GEOMETRY_DE = "Ein handgehaltenes Frontkamera-Selfie aus plausibler Armlängendistanz mit leichter, realistischer Weitwinkelperspektive der Frontkamera. Die erwachsene Person passt natürlich in den Bildrahmen; es gibt keine externe fotografierende Person. Halte die Geometrie von haltendem Arm und Smartphone anatomisch plausibel.";
const GEOMETRY_EN = "A handheld front-camera selfie at a plausible arm-length distance with mild, realistic front-camera wide-angle perspective. The adult subject fits naturally within the frame; there is no external photographer. Keep the holding arm and smartphone geometry anatomically plausible.";
const BINDING_PATHS = ["camera.device", "camera.framing", "selfieMode.enabled", "selfieMode.type"] as const;
const CAPTURE_PATHS = ["camera.device", "camera.framing", "selfieMode.enabled", "selfieMode.phoneVisibility", "selfieMode.type"] as const;

export const selfieSection: PromptSectionProvider = {
  id: "selfie",
  provide: (state) => {
    const mode = objectAt(state.values, "selfieMode");
    const enabled = mode?.enabled === true && mode.type === "selfie.front" && typeof mode.phoneVisibility === "string";
    const german = state.facts.values.promptLanguage === "Deutsch";
    const fragments = enabled ? [
      createResolvedFragmentDraft(state, "selfie", "selfie.binding", german ? BINDING_DE : BINDING_EN, BINDING_PATHS),
      createResolvedFragmentDraft(state, "selfie", "selfie.capture", german ? CAPTURE_DE : CAPTURE_EN, CAPTURE_PATHS),
      createResolvedFragmentDraft(state, "selfie", "selfie.geometry", german ? GEOMETRY_DE : GEOMETRY_EN, CAPTURE_PATHS),
    ] : undefined;
    return [createResolvedSectionDraft(state, "selfie", "Selfie binding", fragments)];
  },
};

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[key];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? child as Readonly<Record<string, unknown>>
    : undefined;
}
