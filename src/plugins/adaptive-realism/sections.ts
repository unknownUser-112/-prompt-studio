import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_CONTENT_DE = "natürliche Smartphone-Schärfung, dezentes HDR, realistische Sensorstruktur und keine Studioperfektion.";
const BASELINE_CONTENT_EN = "natural smartphone sharpening, subtle HDR, realistic sensor texture, and no studio-perfect rendering.";
const ULTRA_CONTENT_DE = "natürliche Hautstruktur, einzelne Haarsträhnen, glaubwürdige Materialeigenschaften und leichte natürliche Asymmetrien. lokal variierende Details, natürliche Mikrofalten, präzise Nähte und realistische Lichtstreuung. Priorität auf vollständiger Anatomie, Füßen, Pose, Silhouette, Kleidung, Material und räumlicher Konsistenz bei realistischer Betrachtungsdistanz. natürliche Smartphone-Schärfung, dezentes HDR, realistische Sensorstruktur und keine Studioperfektion.";
const ULTRA_CONTENT_EN = "natural skin texture, individual hair strands, credible material properties, and subtle natural asymmetry. locally varying detail, natural micro-folds, precise seams, and realistic light scattering. prioritize complete anatomy, feet, pose, silhouette, clothing, material, and spatial consistency at a realistic viewing distance. natural smartphone sharpening, subtle HDR, realistic sensor texture, and no studio-perfect rendering.";
const REFERENCE_CONTENT_DE = "natürliche Hautstruktur, einzelne Haarsträhnen, glaubwürdige Materialeigenschaften und leichte natürliche Asymmetrien. lokal variierende Details, natürliche Mikrofalten, präzise Nähte und realistische Lichtstreuung. Priorität auf vollständiger Anatomie, Füßen, Pose, Silhouette, Kleidung, Material und räumlicher Konsistenz bei realistischer Betrachtungsdistanz. maximale Identitätskonsistenz, präzise Geometrie, realistische Maßstäbe und referenzgetreue Oberflächendarstellung. natürliche Smartphone-Schärfung, dezentes HDR, realistische Sensorstruktur und keine Studioperfektion.";
const REFERENCE_CONTENT_EN = "natural skin texture, individual hair strands, credible material properties, and subtle natural asymmetry. locally varying detail, natural micro-folds, precise seams, and realistic light scattering. prioritize complete anatomy, feet, pose, silhouette, clothing, material, and spatial consistency at a realistic viewing distance. maximum identity consistency, precise geometry, real-world scale, and reference-grade surface rendering. natural smartphone sharpening, subtle HDR, realistic sensor texture, and no studio-perfect rendering.";
const CAPTURE_EN = "SKIN AND CAPTURE APPEARANCE\nnatural skin appearance with believable texture. natural, authentic photographic character. natural color rendering and balanced contrast.";

export const adaptiveRealismSection: PromptSectionProvider = {
  id: "adaptive-realism",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const level = resolvedRealismLevel(state.values);
    const content = realismContent(level, german);
    const realism = createResolvedSectionDraft(state, "adaptive-realism", `${german ? "ADAPTIVER REALISMUS" : "ADAPTIVE REALISM"}\n${content}`, [
      createResolvedFragmentDraft(
        state,
        "adaptive-realism",
        "realism.adaptive",
        content,
        [level === undefined ? "realism.reference" : "realism.level"],
      ),
    ]);
    const capture = !german && hasCaptureAppearance(state.values)
      ? createResolvedSectionDraft(state, "adaptive-realism", CAPTURE_EN, [
        createResolvedFragmentDraft(
          state,
          "adaptive-realism",
          "realism.capture-appearance",
          "natural skin appearance with believable texture. natural, authentic photographic character. natural color rendering and balanced contrast.",
          ["captureAppearance"],
        ),
      ])
      : undefined;
    return [
      { ...realism, slotId: "adaptive-realism-a-reference" },
      ...(capture === undefined ? [] : [{ ...capture, slotId: "adaptive-realism-b-capture" }]),
    ];
  },
};

function resolvedRealismLevel(values: unknown): string | undefined {
  if (values === null || Array.isArray(values) || typeof values !== "object") return undefined;
  const realism = (values as Readonly<Record<string, unknown>>).realism;
  if (realism === null || Array.isArray(realism) || typeof realism !== "object") return undefined;
  const level = (realism as Readonly<Record<string, unknown>>).level;
  return typeof level === "string" ? level : undefined;
}

function realismContent(level: string | undefined, german: boolean): string {
  if (level === undefined) return german ? BASELINE_CONTENT_DE : BASELINE_CONTENT_EN;
  if (level === "realism.ultra") return german ? ULTRA_CONTENT_DE : ULTRA_CONTENT_EN;
  if (level === "realism.reference") return german ? REFERENCE_CONTENT_DE : REFERENCE_CONTENT_EN;
  throw new Error(`Unsupported resolved realism.level: ${level}`);
}

function hasCaptureAppearance(values: unknown): boolean {
  return values !== null && !Array.isArray(values) && typeof values === "object"
    && (values as Readonly<Record<string, unknown>>).captureAppearance !== undefined;
}
