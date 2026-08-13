import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_DE = "ADAPTIVE MATERIALPHYSIK\nOberteil: blickdichter Stoff mit vollständig verdeckender Materialwirkung; Die fotografische Darstellung wird passend zu Material und Licht abgeleitet.; automatisch angepasster Materialdetailgrad; materialgerechte Oberfläche; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.\nHose: blickdichter Stoff mit vollständig verdeckender Materialwirkung; Die fotografische Darstellung wird passend zu Material und Licht abgeleitet.; automatisch angepasster Materialdetailgrad; materialgerechte Oberfläche; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const BASELINE_EN = "ADAPTIVE MATERIAL PHYSICS\ntop: opaque fabric with fully covering material behavior; Photographic presentation is derived from the material and lighting.; automatically adapted material detail; material-appropriate surface response; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.\ntrousers: opaque fabric with fully covering material behavior; Photographic presentation is derived from the material and lighting.; automatically adapted material detail; material-appropriate surface response; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const CONTEXT_DE = "ADAPTIVER PHYSIKKONTEXT\nnatürliche Gewichtsverlagerung, vertikale Schwerkraftfalten und lokale Spannung an Kontaktpunkten. Haarvolumen, Strähnenorganisation und Schwerkraftwirkung bleiben zur Frisur und Pose konsistent. natürliche Smartphone-Schärfung, dezentes HDR, realistischer Weißabgleich und glaubwürdige optische Begrenzungen. weiche Mikroschatten und materialabhängige Reflexionen folgen derselben Lichtquelle.";
const CONTEXT_EN = "ADAPTIVE PHYSICAL CONTEXT\nnatural weight transfer, vertical gravity folds, and localized tension at contact points. hair volume, lock organization, and gravity remain consistent with the hairstyle and pose. natural smartphone sharpening, subtle HDR, realistic white balance, and credible optical limitations. soft micro-shadows and material-dependent reflections follow the same light source.";

export const materialPhysicsSection: PromptSectionProvider = {
  id: "material-physics",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const material = createResolvedSectionDraft(state, "material-physics", german ? BASELINE_DE : BASELINE_EN);
    const context = hasAdaptivePhysicalContext(state.values)
      ? createResolvedSectionDraft(state, "material-physics", german ? CONTEXT_DE : CONTEXT_EN)
      : undefined;
    return [
      { ...material, slotId: "material-physics-a-material" },
      ...(context === undefined ? [] : [{ ...context, slotId: "material-physics-b-context" }]),
    ];
  },
};

function hasAdaptivePhysicalContext(values: unknown): boolean {
  if (values === null || Array.isArray(values) || typeof values !== "object") return false;
  const material = (values as Readonly<Record<string, unknown>>).material;
  return material !== null && !Array.isArray(material) && typeof material === "object"
    && (material as Readonly<Record<string, unknown>>).adaptivePhysicalContext !== undefined;
}
