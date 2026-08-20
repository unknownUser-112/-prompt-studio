import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_DE = "STIL\nAuthentisches, realistisches Erwachsenen-Fashion- oder Lifestylefoto. zurückhaltendes Smartphone-HDR. leichte rechnerische Schärfung. sehr dezentes Sensorrauschen. leicht weichere Details an den Bildrändern. klarer Bodenkontakt mit glaubwürdiger Gewichtsverteilung. leichte natürliche Asymmetrie in Schulter-, Becken- und Beinachse. Gelenke behalten natürliche Bewegungsradien; Hände, Finger und Füße sind vollständig und anatomisch verbunden. Kamerahöhe und Horizont verhindern überlange Beine, verkürzten Oberkörper oder vergrößerte Füße. natürliche Gruppierung einzelner Strähnen. Die Strähnen wirken natürlich organisiert und bleiben leicht asymmetrisch verteilt. einige natürlich verteilte einzelne abstehende Haare mit zufälliger, nicht gleichförmiger Verteilung. Glaubwürdige Anatomie sowie konsistente Raum-, Material- und Lichtphysik. Kein Text, keine Logos und kein Wasserzeichen.";
const BASELINE_EN = "STYLE\nAuthentic, realistic adult fashion or lifestyle photography. Credible anatomy and consistent spatial, material, and lighting physics. No artificial skin smoothing, excessive blur, heavy cinematic grading, or watermark. No visible text, logos, or other branding.";
const GENERAL_DE = "Authentisches, realistisches Erwachsenen-Fashion- oder Lifestylefoto.";
const GENERAL_EN = "Authentic, realistic adult fashion or lifestyle photography.";
const CAPTURE_DE = "zurückhaltendes Smartphone-HDR. leichte rechnerische Schärfung. sehr dezentes Sensorrauschen. leicht weichere Details an den Bildrändern.";
const WARM_CAPTURE_DE = "ausgewogene, zurückhaltende Smartphone-HDR-Verarbeitung. klare, aber nicht überschärfte rechnerische Detailzeichnung. sehr dezentes Sensorrauschen. leicht weichere Details an den Bildrändern.";
const BODY_DE = "klarer Bodenkontakt mit glaubwürdiger Gewichtsverteilung. leichte natürliche Asymmetrie in Schulter-, Becken- und Beinachse. Gelenke behalten natürliche Bewegungsradien; Hände, Finger und Füße sind vollständig und anatomisch verbunden. Kamerahöhe und Horizont verhindern überlange Beine, verkürzten Oberkörper oder vergrößerte Füße.";
const TELE_BODY_DE = "klarer Bodenkontakt mit glaubwürdiger Gewichtsverteilung. leichte natürliche Asymmetrie in Schulter-, Becken- und Beinachse. Gelenke behalten natürliche Bewegungsradien; Hände, Finger und Füße sind vollständig und anatomisch verbunden. leichte Telekompression mit natürlicher Gesichtsperspektive und ruhigem Hintergrund. Kamerahöhe und Horizont verhindern überlange Beine, verkürzten Oberkörper oder vergrößerte Füße.";
const HAIR_DE = "natürliche Gruppierung einzelner Strähnen. Die Strähnen wirken natürlich organisiert und bleiben leicht asymmetrisch verteilt. einige natürlich verteilte einzelne abstehende Haare mit zufälliger, nicht gleichförmiger Verteilung.";
const SPATIAL_DE = "Glaubwürdige Anatomie sowie konsistente Raum-, Material- und Lichtphysik.";
const SPATIAL_EN = "Credible anatomy and consistent spatial, material, and lighting physics.";
const CAPTURE_QUALITY_EN = "No artificial skin smoothing, excessive blur, heavy cinematic grading, or watermark.";
const BRANDING_DE = "Kein sichtbarer Text, keine Logos und kein sonstiges Branding.";
const BRANDING_EN = "No visible text, logos, or other branding.";

export const modelBehaviourSection: PromptSectionProvider = {
  id: "model-behaviour",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const lens = resolvedString(state.values, "camera.lens");
    const photoLook = resolvedString(state.values, "camera.photoLook");
    const branding = resolvedBranding(state.values);
    const captureCharacter = photoLook === "photoLook.warm" ? WARM_CAPTURE_DE : CAPTURE_DE;
    const bodyMechanics = lens === "lens.portrait_85mm" ? TELE_BODY_DE : BODY_DE;
    const brandingRestriction = branding === undefined ? (german ? BRANDING_DE : BRANDING_EN) : brandedRestriction(branding, german);
    const fragment = (id: string, text: string, paths: readonly string[] = ["model.behaviour"]) => (
      createResolvedFragmentDraft(state, "model-behaviour", id, text, paths)
    );
    const fragments = german ? [
      fragment("style.general", GENERAL_DE),
      fragment(
        "style.capture-character",
        captureCharacter,
        photoLook === "photoLook.warm" ? ["model.behaviour", "camera.photoLook"] : ["model.behaviour"],
      ),
      fragment(
        "realism.body-mechanics",
        bodyMechanics,
        lens === "lens.portrait_85mm" ? ["model.behaviour", "camera.lens"] : ["model.behaviour"],
      ),
      fragment("realism.hair-details", HAIR_DE),
      fragment("realism.natural-irregularity", "Natürliche Unregelmäßigkeit hat Vorrang vor makelloser visueller Perfektion."),
      fragment("realism.spatial-material-light", SPATIAL_DE),
      fragment("realism.photographic-character", "Die Aufnahme zeigt glaubwürdige Anatomie, realistische Raumgeometrie und konsistente Material- und Lichtphysik."),
      fragment("restrictions.capture-quality", "Keine künstliche Hautglättung, keine übertriebene Unschärfe, kein starkes Cinematic Color Grading und kein Wasserzeichen."),
      fragment("restrictions.capture-quality-detailed", "Keine künstliche Hautglättung, keine übertriebene Hintergrundunschärfe, kein starkes Cinematic Color Grading und kein Wasserzeichen."),
      branding === undefined
        ? fragment("restrictions.branding", brandingRestriction)
        : fragment("restrictions.branding-authorized", brandingRestriction, brandTracePaths(branding)),
    ] : [
      fragment("style.general", GENERAL_EN),
      fragment("realism.natural-irregularity", "Natural irregularity takes priority over flawless visual perfection."),
      fragment("realism.spatial-material-light", SPATIAL_EN),
      fragment("realism.photographic-character", "The photograph must show believable anatomy, realistic spatial geometry, and consistent material and lighting physics."),
      fragment("restrictions.capture-quality", CAPTURE_QUALITY_EN),
      fragment("restrictions.capture-quality-detailed", "No artificial skin smoothing, no excessive background blur, no heavy cinematic color grading, and no watermark."),
      branding === undefined
        ? fragment("restrictions.branding", brandingRestriction)
        : fragment("restrictions.branding-authorized", brandingRestriction, brandTracePaths(branding)),
    ];
    return [createResolvedSectionDraft(state, "model-behaviour", `${sectionText(german, lens, photoLook, branding, brandingRestriction)}\n`, fragments)];
  },
};

type ResolvedBranding = {
  readonly allowedGarment: string;
  readonly model?: string;
  readonly name: string;
  readonly placement: string;
  readonly visibility: string;
};

function sectionText(
  german: boolean,
  lens: string | undefined,
  photoLook: string | undefined,
  branding: ResolvedBranding | undefined,
  brandingRestriction: string,
): string {
  if (lens !== "lens.portrait_85mm" && photoLook !== "photoLook.warm" && branding === undefined) {
    return german ? BASELINE_DE : BASELINE_EN;
  }
  if (german) {
    const capture = photoLook === "photoLook.warm" ? WARM_CAPTURE_DE : CAPTURE_DE;
    const body = lens === "lens.portrait_85mm" ? TELE_BODY_DE : BODY_DE;
    const closing = branding === undefined
      ? "Kein Text, keine Logos und kein Wasserzeichen."
      : "kein fremder Text und keine zusätzlichen Logos und kein Wasserzeichen.";
    return `STIL\n${GENERAL_DE} ${capture} ${body} ${HAIR_DE} ${SPATIAL_DE} ${closing}`;
  }
  return branding === undefined
    ? BASELINE_EN
    : `STYLE\n${GENERAL_EN} ${SPATIAL_EN} ${CAPTURE_QUALITY_EN}\n${brandingRestriction}`;
}

function resolvedBranding(values: unknown): ResolvedBranding | undefined {
  const brand = objectAt(values, "brand");
  if (typeof brand?.allowedGarment !== "string"
    || typeof brand.name !== "string"
    || typeof brand.placement !== "string"
    || typeof brand.visibility !== "string") return undefined;
  return {
    allowedGarment: brand.allowedGarment,
    name: brand.name,
    placement: brand.placement,
    visibility: brand.visibility,
    ...(typeof brand.model === "string" ? { model: brand.model } : {}),
  };
}

function brandedRestriction(branding: ResolvedBranding, german: boolean): string {
  if (german) {
    const garment = branding.allowedGarment === "upper" ? "Oberteil" : "klassische weiße Sneaker";
    const visibility = branding.visibility === "Dezent sichtbar"
      ? "Das Logo soll klein und dezent bleiben."
      : "Das Logo soll klar erkennbar und zugleich natürlich in das Material integriert sein.";
    return `Das authentische Branding einschließlich des Markenlogos ist bewusst sichtbar und ausschließlich wie folgt erlaubt: ${branding.name}: ausschließlich auf ${garment}.\n${visibility} Bevorzugte Platzierung: ${branding.placement}.\nDas Logo muss der natürlichen Konstruktion des Kleidungsstücks folgen und darf nur dort erscheinen, wo ein reales Produkt Herstellerbranding tragen würde. Markenschrift ist nur als Bestandteil dieses ausdrücklich gewünschten Brandings erlaubt. Kein fremder Text, keine zusätzlichen oder duplizierten Logos und kein Branding auf anderen Kleidungsstücken, Accessoires, Gegenständen oder in der Umgebung.`;
  }
  const garment = branding.allowedGarment === "footwear" ? "classic white sneakers" : "the top";
  const placement = branding.placement === "Schuhseite / Zunge" ? "shoe side or tongue" : branding.placement;
  const visibility = branding.visibility === "Deutlich sichtbar"
    ? "Make the logo clearly recognizable while naturally integrated into the material."
    : "Keep the logo small and subtle.";
  return `Authentic branding, including the brand logo, is intentionally visible and permitted only as follows: ${branding.name}: ${garment} only.\n${visibility} Preferred placement: ${placement}.\nThe logo must follow the natural construction of the garment and may appear only where a real product would contain manufacturer branding. Brand lettering is permitted only as part of this explicitly requested branding. No unrelated text, additional or duplicated logos, or branding on other garments, accessories, objects, or the environment.`;
}

function brandTracePaths(branding: ResolvedBranding): readonly string[] {
  return [
    "brand.allowedGarment",
    ...(branding.model === undefined ? [] : ["brand.model"]),
    "brand.name",
    "brand.placement",
    "brand.visibility",
  ];
}

function resolvedString(values: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, segment) => {
    if (current === null || Array.isArray(current) || typeof current !== "object") return undefined;
    return (current as Readonly<Record<string, unknown>>)[segment];
  }, values);
  return typeof value === "string" ? value : undefined;
}

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[key];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? child as Readonly<Record<string, unknown>>
    : undefined;
}
