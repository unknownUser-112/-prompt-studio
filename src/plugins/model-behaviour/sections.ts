import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_DE = "STIL\nAuthentisches, realistisches Erwachsenen-Fashion- oder Lifestylefoto. zurückhaltendes Smartphone-HDR. leichte rechnerische Schärfung. sehr dezentes Sensorrauschen. leicht weichere Details an den Bildrändern. klarer Bodenkontakt mit glaubwürdiger Gewichtsverteilung. leichte natürliche Asymmetrie in Schulter-, Becken- und Beinachse. Gelenke behalten natürliche Bewegungsradien; Hände, Finger und Füße sind vollständig und anatomisch verbunden. Kamerahöhe und Horizont verhindern überlange Beine, verkürzten Oberkörper oder vergrößerte Füße. natürliche Gruppierung einzelner Strähnen. Die Strähnen wirken natürlich organisiert und bleiben leicht asymmetrisch verteilt. einige natürlich verteilte einzelne abstehende Haare mit zufälliger, nicht gleichförmiger Verteilung. Glaubwürdige Anatomie sowie konsistente Raum-, Material- und Lichtphysik. Kein Text, keine Logos und kein Wasserzeichen.";
const BASELINE_EN = "STYLE\nAuthentic, realistic adult fashion or lifestyle photography. Credible anatomy and consistent spatial, material, and lighting physics. No artificial skin smoothing, excessive blur, heavy cinematic grading, or watermark. No visible text, logos, or other branding.";

export const modelBehaviourSection: PromptSectionProvider = {
  id: "model-behaviour",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const fragment = (id: string, text: string) => createResolvedFragmentDraft(state, "model-behaviour", id, text, ["model.behaviour"]);
    const fragments = german ? [
      fragment("style.general", "Authentisches, realistisches Erwachsenen-Fashion- oder Lifestylefoto."),
      fragment("style.capture-character", "zurückhaltendes Smartphone-HDR. leichte rechnerische Schärfung. sehr dezentes Sensorrauschen. leicht weichere Details an den Bildrändern."),
      fragment("realism.body-mechanics", "klarer Bodenkontakt mit glaubwürdiger Gewichtsverteilung. leichte natürliche Asymmetrie in Schulter-, Becken- und Beinachse. Gelenke behalten natürliche Bewegungsradien; Hände, Finger und Füße sind vollständig und anatomisch verbunden. Kamerahöhe und Horizont verhindern überlange Beine, verkürzten Oberkörper oder vergrößerte Füße."),
      fragment("realism.hair-details", "natürliche Gruppierung einzelner Strähnen. Die Strähnen wirken natürlich organisiert und bleiben leicht asymmetrisch verteilt. einige natürlich verteilte einzelne abstehende Haare mit zufälliger, nicht gleichförmiger Verteilung."),
      fragment("realism.natural-irregularity", "Natürliche Unregelmäßigkeit hat Vorrang vor makelloser visueller Perfektion."),
      fragment("realism.spatial-material-light", "Glaubwürdige Anatomie sowie konsistente Raum-, Material- und Lichtphysik."),
      fragment("realism.photographic-character", "Die Aufnahme zeigt glaubwürdige Anatomie, realistische Raumgeometrie und konsistente Material- und Lichtphysik."),
      fragment("restrictions.capture-quality", "Keine künstliche Hautglättung, keine übertriebene Unschärfe, kein starkes Cinematic Color Grading und kein Wasserzeichen."),
      fragment("restrictions.capture-quality-detailed", "Keine künstliche Hautglättung, keine übertriebene Hintergrundunschärfe, kein starkes Cinematic Color Grading und kein Wasserzeichen."),
      fragment("restrictions.branding", "Kein sichtbarer Text, keine Logos und kein sonstiges Branding."),
    ] : [
      fragment("style.general", "Authentic, realistic adult fashion or lifestyle photography."),
      fragment("realism.natural-irregularity", "Natural irregularity takes priority over flawless visual perfection."),
      fragment("realism.spatial-material-light", "Credible anatomy and consistent spatial, material, and lighting physics."),
      fragment("realism.photographic-character", "The photograph must show believable anatomy, realistic spatial geometry, and consistent material and lighting physics."),
      fragment("restrictions.capture-quality", "No artificial skin smoothing, excessive blur, heavy cinematic grading, or watermark."),
      fragment("restrictions.capture-quality-detailed", "No artificial skin smoothing, no excessive background blur, no heavy cinematic color grading, and no watermark."),
      fragment("restrictions.branding", "No visible text, logos, or other branding."),
    ];
    return [createResolvedSectionDraft(state, "model-behaviour", `${german ? BASELINE_DE : BASELINE_EN}\n`, fragments)];
  },
};
