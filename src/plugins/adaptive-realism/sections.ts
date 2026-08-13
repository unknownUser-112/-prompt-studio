import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_DE = "ADAPTIVER REALISMUS\nnatürliche Smartphone-Schärfung, dezentes HDR, realistische Sensorstruktur und keine Studioperfektion.";
const BASELINE_EN = "ADAPTIVE REALISM\nnatural smartphone sharpening, subtle HDR, realistic sensor texture, and no studio-perfect rendering.";
const CAPTURE_EN = "SKIN AND CAPTURE APPEARANCE\nnatural skin appearance with believable texture. natural, authentic photographic character. natural color rendering and balanced contrast.";

export const adaptiveRealismSection: PromptSectionProvider = {
  id: "adaptive-realism",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const realism = createResolvedSectionDraft(state, "adaptive-realism", german ? BASELINE_DE : BASELINE_EN);
    const capture = !german && hasCaptureAppearance(state.values)
      ? createResolvedSectionDraft(state, "adaptive-realism", CAPTURE_EN)
      : undefined;
    return [
      { ...realism, slotId: "adaptive-realism-a-reference" },
      ...(capture === undefined ? [] : [{ ...capture, slotId: "adaptive-realism-b-capture" }]),
    ];
  },
};

function hasCaptureAppearance(values: unknown): boolean {
  return values !== null && !Array.isArray(values) && typeof values === "object"
    && (values as Readonly<Record<string, unknown>>).captureAppearance !== undefined;
}
