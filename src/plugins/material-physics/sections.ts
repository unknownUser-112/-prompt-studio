import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const OPAQUE_DE = "blickdichter Stoff mit vollständig verdeckender Materialwirkung; Die fotografische Darstellung wird passend zu Material und Licht abgeleitet.; automatisch angepasster Materialdetailgrad; materialgerechte Oberfläche; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const OPAQUE_EN = "opaque fabric with fully covering material behavior; Photographic presentation is derived from the material and lighting.; automatically adapted material detail; material-appropriate surface response; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const TRANSLUCENT_DE = "leicht lichtdurchlässiger Stoff mit dezent erkennbarer Transparenz; Die fotografische Darstellung wird passend zu Material und Licht abgeleitet.; automatisch angepasster Materialdetailgrad; materialgerechte Oberfläche; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const TRANSLUCENT_EN = "lightly translucent fabric with subtly visible transparency; Photographic presentation is derived from the material and lighting.; automatically adapted material detail; material-appropriate surface response; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const PREMIUM_TRANSLUCENT_DE = "leicht lichtdurchlässiger Stoff mit dezent erkennbarer Transparenz; Die Materialeigenschaft wird unter realistischem Licht natürlich und eindeutig sichtbar.; hochwertige Faser-, Naht- und Faltendetails; leicht glänzende Oberfläche mit kontrollierten Reflexionen; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const PREMIUM_TRANSLUCENT_EN = "lightly translucent fabric with subtly visible transparency; The material property is rendered naturally and distinctly under realistic light.; high-quality fiber, seam, and fold details; subtly glossy surface with controlled reflections; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const REFERENCE_LINEN_EN = "opaque fabric with fully covering material behavior; The material property is rendered clearly and distinctly without unrealistic enhancement.; reference-grade material, fiber, and seam fidelity; matte surface with diffuse light scattering; material-appropriate fiber and weave structure; vertical gravity folds with localized tension at contact points.";
const CONTEXT_CONTENT_DE = "natürliche Gewichtsverlagerung, vertikale Schwerkraftfalten und lokale Spannung an Kontaktpunkten. Haarvolumen, Strähnenorganisation und Schwerkraftwirkung bleiben zur Frisur und Pose konsistent. natürliche Smartphone-Schärfung, dezentes HDR, realistischer Weißabgleich und glaubwürdige optische Begrenzungen. weiche Mikroschatten und materialabhängige Reflexionen folgen derselben Lichtquelle.";
const CONTEXT_CONTENT_EN = "natural weight transfer, vertical gravity folds, and localized tension at contact points. hair volume, lock organization, and gravity remain consistent with the hairstyle and pose. natural smartphone sharpening, subtle HDR, realistic white balance, and credible optical limitations. soft micro-shadows and material-dependent reflections follow the same light source.";
const CONTEXT_DE = `ADAPTIVER PHYSIKKONTEXT\n${CONTEXT_CONTENT_DE}`;
const CONTEXT_EN = `ADAPTIVE PHYSICAL CONTEXT\n${CONTEXT_CONTENT_EN}`;

export const materialPhysicsSection: PromptSectionProvider = {
  id: "material-physics",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const resolvedMaterials = objectAt(state.values, "material");
    const activeSlots = stringArrayAt(resolvedMaterials, "activeSlots");
    const materialLines = activeSlots.flatMap((slot) => slot === "upper" || slot === "lower"
      ? [materialLine(slot, resolvedMaterials?.[slot], german, resolvedMaterials?.[`${slot}Presentation`])]
      : []).filter((line): line is MaterialLine => line !== undefined);
    const materialText = materialLines.map(({ text }) => text).join("\n");
    const material = materialLines.length === 0
      ? undefined
      : createResolvedSectionDraft(state, "material-physics", `${german ? "ADAPTIVE MATERIALPHYSIK" : "ADAPTIVE MATERIAL PHYSICS"}\n${materialText}`, [
        createResolvedFragmentDraft(
          state,
          "material-physics",
          "material.physics",
          materialText,
          ["material.activeSlots", ...materialLines.flatMap(({ paths }) => paths)],
        ),
        createResolvedFragmentDraft(
          state,
          "material-physics",
          "material.inline-physics",
          materialLines.map(({ text }) => text).join(" "),
          ["material.activeSlots", ...materialLines.flatMap(({ paths }) => paths)],
        ),
      ]);
    const context = hasAdaptivePhysicalContext(state.values)
      ? createResolvedSectionDraft(state, "material-physics", german ? CONTEXT_DE : CONTEXT_EN, [
        createResolvedFragmentDraft(
          state,
          "material-physics",
          "material.adaptive-physical-context",
          german ? CONTEXT_CONTENT_DE : CONTEXT_CONTENT_EN,
          ["material.adaptivePhysicalContext"],
        ),
      ])
      : undefined;
    return [
      ...(material === undefined ? [] : [{ ...material, slotId: "material-physics-a-material" }]),
      ...(context === undefined ? [] : [{ ...context, slotId: "material-physics-b-context" }]),
    ];
  },
};

type MaterialLine = { readonly paths: readonly string[]; readonly text: string };

function materialLine(slot: "upper" | "lower", value: unknown, german: boolean, presentation: unknown): MaterialLine | undefined {
  if (typeof value !== "string") return undefined;
  const label = slot === "upper" ? (german ? "Oberteil" : "top") : (german ? "Hose" : "trousers");
  const translucent = value === "Voile" || value === "Organza" || value === "material.voile" || value === "material.organza";
  const opaque = value === "material.cotton" || value === "material.denim" || value === "material.linen" || value === "Baumwolle" || value === "Denim";
  const linen = slot === "lower" && value === "material.linen";
  const referenceLinen = linen && isReferenceLinenPresentation(presentation);
  const premiumTranslucent = translucent && isPremiumTranslucentPresentation(presentation);
  if (!translucent && !opaque) throw new Error(`Unsupported resolved ${slot} material: ${value}`);
  return {
    paths: [
      `material.${slot}`,
      ...(referenceLinen && !german ? ["material.lowerPresentation"] : []),
      ...(premiumTranslucent ? [`material.${slot}Presentation`] : []),
    ],
    text: `${label}: ${premiumTranslucent
      ? (german ? PREMIUM_TRANSLUCENT_DE : PREMIUM_TRANSLUCENT_EN)
      : referenceLinen && !german
        ? REFERENCE_LINEN_EN
        : translucent
          ? (german ? TRANSLUCENT_DE : TRANSLUCENT_EN)
          : (german ? OPAQUE_DE : OPAQUE_EN)}`,
  };
}

function isReferenceLinenPresentation(value: unknown): boolean {
  if (value === null || Array.isArray(value) || typeof value !== "object") return false;
  const presentation = value as Readonly<Record<string, unknown>>;
  return presentation.opacity === "materialOpacity.opaque"
    && presentation.presentation === "materialPresentation.clear"
    && presentation.realism === "materialRealism.reference"
    && presentation.surface === "materialSurface.matte";
}

function isPremiumTranslucentPresentation(value: unknown): boolean {
  if (value === null || Array.isArray(value) || typeof value !== "object") return false;
  const presentation = value as Readonly<Record<string, unknown>>;
  return presentation.opacity === "materialOpacity.light_translucent"
    && presentation.presentation === "materialPresentation.natural"
    && presentation.realism === "materialRealism.premium"
    && presentation.surface === "materialSurface.subtle_gloss";
}

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[key];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? child as Readonly<Record<string, unknown>>
    : undefined;
}

function stringArrayAt(value: Readonly<Record<string, unknown>> | undefined, key: string): readonly string[] {
  const candidate = value?.[key];
  if (!Array.isArray(candidate) || !candidate.every((item) => typeof item === "string")) return [];
  return candidate;
}

function hasAdaptivePhysicalContext(values: unknown): boolean {
  if (values === null || Array.isArray(values) || typeof values !== "object") return false;
  const material = (values as Readonly<Record<string, unknown>>).material;
  return material !== null && !Array.isArray(material) && typeof material === "object"
    && (material as Readonly<Record<string, unknown>>).adaptivePhysicalContext !== undefined;
}
