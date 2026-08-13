import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const SUBJECT_CONTENT_DE = "Die dargestellte Person ist eine erwachsene Frau, 21 Jahre alt und 160 cm groß. Sie hat eine schlanke, ausgewogene Figur mit einem durchschnittlich großen Brustvolumen, einer natürlich ausgewogenen Brustform und einer ausgewogenen Hüftproportionen. Die ausgewählten Brustproportionen bleiben anatomisch plausibel. Gewichtsverteilung, Haltung, Schwerkraft, natürliches Weichgewebeverhalten, Silhouette sowie Spannung und Kompression der Kleidung reagieren physikalisch glaubwürdig auf Körperform, Pose und Bewegung. Sie hat einen hellen, warmen Hautton und graublaue Augen. Sie trägt brustlange, blonde, natürlich wellige Haare, die offen getragen werden.";
const SKIN_CONTENT_DE = "natürlicher Haut-Look mit glaubwürdiger Struktur. sichtbare Poren mit natürlich variierender Dichte.";
const SUBJECT_CONTENT_EN = "The subject is an adult woman, 21 years old and 160 cm tall. She has a slim and balanced figure, an average chest volume, a naturally balanced chest shape, and balanced hip proportions. Maintain physically plausible anatomy consistent with the selected chest proportions. Natural weight distribution, posture, gravity, soft tissue behavior, silhouette, garment tension, compression, and body mechanics remain physically believable from every camera angle. She has fair skin with warm undertones and gray-blue eyes. Her chest-length blonde naturally wavy hair is worn loose.";
const SKIN_CONTENT_EN = "visible pores with naturally varying density. visible natural skin-tone variation and small localized redness. visible natural lip texture. slight natural facial asymmetry. no beauty retouching or artificial skin smoothing. natural grouping of individual strands. the strands are naturally organized while remaining slightly asymmetrical. naturally distributed flyaways with random, non-uniform placement. naturally visible baby hairs along the hairline. no perfectly symmetrical or uniformly arranged hair. Natural irregularity takes priority over flawless visual perfection.";
const POSE_CONTENT_DE = "frontal und aufrecht stehend, Gewicht locker auf einem Bein. Sie blickt leicht links an der Kamera vorbei und zeigt einen entspannten Ausdruck.";
const POSE_CONTENT_EN = "Standing upright with weight resting naturally on one leg. She looks slightly past the camera and has a relaxed expression.";
const FACE_CONTENT_DE = "Die erwachsene Person hat eine ovale Gesichtsform, mandelförmige Augen, eine gerade natürlich proportionierte Nase und klar erwachsene, ausgewogene Gesichtszüge. Das bereits genannte tatsächliche Erwachsenenalter bleibt die maßgebliche Identitätsangabe; die Gesichtsausprägung verändert nur Weichheit, Frische, Kontur oder natürliche Reife. Die Merkmale bleiben natürlich proportioniert und alterskohärent.";
const FACE_CONTENT_EN = "The adult subject has oval face shape, almond-shaped eyes, straight naturally proportioned nose, clearly adult, balanced facial features. The already stated actual adult age remains the primary identity attribute; the selected facial appearance affects only softness, freshness, contour definition, or natural maturity. These features remain naturally proportioned and age-coherent.";
const SUBJECT_DE = `PERSON\n${SUBJECT_CONTENT_DE}`;
const SKIN_DE = `HAUTREALISMUS & MAKE-UP\n${SKIN_CONTENT_DE}`;
const SUBJECT_EN = `SUBJECT\n${SUBJECT_CONTENT_EN}`;
const SKIN_EN = `SKIN REALISM AND MAKEUP\n${SKIN_CONTENT_EN}`;
const POSE_DE = `POSE & AKTION\n${POSE_CONTENT_DE}`;
const POSE_EN = `POSE AND ACTION\n${POSE_CONTENT_EN}`;
const FACE_DE = `GESICHTSMERKMALE\n${FACE_CONTENT_DE}`;
const FACE_EN = `FACIAL FEATURES\n${FACE_CONTENT_EN}`;

const SUBJECT_PATHS = [
  "character.adult", "character.age", "character.bodyBuild", "character.chestShape", "character.chestVolume",
  "character.eyeColor", "character.gender", "character.hair.color", "character.hair.length", "character.hair.style",
  "character.hair.texture", "character.heightCentimeters", "character.lowerBody", "character.skinTone",
] as const;
const FACE_PATHS = ["character.adult", "character.age", "character.eyeShape", "character.faceAge", "character.faceShape", "character.noseShape"] as const;
const POSE_PATHS = ["pose.expression", "pose.gaze", "pose.position"] as const;

export const characterSheetSection: PromptSectionProvider = {
  id: "character-sheet",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const subjectFragment = createResolvedFragmentDraft(state, "character-sheet", "character.subject", german ? SUBJECT_CONTENT_DE : SUBJECT_CONTENT_EN, SUBJECT_PATHS);
    const skinFragment = createResolvedFragmentDraft(
      state,
      "character-sheet",
      "realism.skin",
      german ? SKIN_CONTENT_DE : SKIN_CONTENT_EN,
      german ? ["character.skinTone"] : ["character.hair.color", "character.hair.length", "character.hair.style", "character.hair.texture", "character.skinTone"],
    );
    const poseFragment = createResolvedFragmentDraft(state, "character-sheet", "pose.action", german ? POSE_CONTENT_DE : POSE_CONTENT_EN, POSE_PATHS);
    const faceFragment = createResolvedFragmentDraft(state, "character-sheet", "character.facial-features", german ? FACE_CONTENT_DE : FACE_CONTENT_EN, FACE_PATHS);
    const subject = createResolvedSectionDraft(state, "character-sheet", `${german ? SUBJECT_DE : SUBJECT_EN}\n`, [subjectFragment]);
    const skin = createResolvedSectionDraft(state, "character-sheet", german ? SKIN_DE : SKIN_EN, [skinFragment]);
    const pose = createResolvedSectionDraft(state, "character-sheet", german ? POSE_DE : POSE_EN, [poseFragment]);
    const face = createResolvedSectionDraft(state, "character-sheet", german ? FACE_DE : FACE_EN, [faceFragment]);
    return [
      { ...subject, slotId: "character-sheet-a-subject" },
      { ...skin, slotId: "character-sheet-b-skin" },
      { ...pose, slotId: "character-sheet-c-pose" },
      { ...face, slotId: "character-sheet-d-face" },
    ];
  },
};
