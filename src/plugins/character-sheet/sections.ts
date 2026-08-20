import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const SUBJECT_CONTENT_DE = "Die dargestellte Person ist eine erwachsene Frau, 21 Jahre alt und 160 cm groß. Sie hat eine schlanke, ausgewogene Figur mit einem durchschnittlich großen Brustvolumen, einer natürlich ausgewogenen Brustform und einer ausgewogenen Hüftproportionen. Die ausgewählten Brustproportionen bleiben anatomisch plausibel. Gewichtsverteilung, Haltung, Schwerkraft, natürliches Weichgewebeverhalten, Silhouette sowie Spannung und Kompression der Kleidung reagieren physikalisch glaubwürdig auf Körperform, Pose und Bewegung. Sie hat einen hellen, warmen Hautton und graublaue Augen. Sie trägt brustlange, blonde, natürlich wellige Haare, die offen getragen werden.";
const IDENTITY_CONSISTENCY_DE = "Identität, Gesichtsmerkmale, Körperproportionen, Haarmerkmale und Outfit bleiben innerhalb des Bildes konsistent.";
const SKIN_CONTENT_DE = "natürlicher Haut-Look mit glaubwürdiger Struktur. sichtbare Poren mit natürlich variierender Dichte.";
const SUBJECT_CONTENT_EN = "The subject is an adult woman, 21 years old and 160 cm tall. She has a slim and balanced figure, an average chest volume, a naturally balanced chest shape, and balanced hip proportions. Maintain physically plausible anatomy consistent with the selected chest proportions. Natural weight distribution, posture, gravity, soft tissue behavior, silhouette, garment tension, compression, and body mechanics remain physically believable from every camera angle. She has fair skin with warm undertones and gray-blue eyes. Her chest-length blonde naturally wavy hair is worn loose.";
const IDENTITY_CONSISTENCY_EN = "Keep identity, facial features, body proportions, hair characteristics, and outfit internally consistent within the single image.";
const SKIN_CONTENT_EN = "visible pores with naturally varying density. visible natural skin-tone variation and small localized redness. visible natural lip texture. slight natural facial asymmetry. no beauty retouching or artificial skin smoothing. natural grouping of individual strands. the strands are naturally organized while remaining slightly asymmetrical. naturally distributed flyaways with random, non-uniform placement. naturally visible baby hairs along the hairline. no perfectly symmetrical or uniformly arranged hair. Natural irregularity takes priority over flawless visual perfection.";
const POSE_RELAXED_DE = "frontal und aufrecht stehend, Gewicht locker auf einem Bein. Sie blickt leicht links an der Kamera vorbei und zeigt einen entspannten Ausdruck.";
const POSE_RELAXED_EN = "Standing upright with weight resting naturally on one leg. She looks slightly past the camera and has a relaxed expression.";
const POSE_LAUGHING_DE = "frontal und aufrecht stehend, Gewicht locker auf einem Bein. Sie blickt leicht links an der Kamera vorbei und lacht natürlich.";
const POSE_LAUGHING_EN = "Standing upright with weight resting naturally on one leg. She looks slightly past the camera and is laughing naturally.";
const FACE_CONTENT_DE = "Die erwachsene Person hat eine ovale Gesichtsform, mandelförmige Augen, eine gerade natürlich proportionierte Nase und klar erwachsene, ausgewogene Gesichtszüge. Das bereits genannte tatsächliche Erwachsenenalter bleibt die maßgebliche Identitätsangabe; die Gesichtsausprägung verändert nur Weichheit, Frische, Kontur oder natürliche Reife. Die Merkmale bleiben natürlich proportioniert und alterskohärent.";
const FACE_CONTENT_EN = "The adult subject has oval face shape, almond-shaped eyes, straight naturally proportioned nose, clearly adult, balanced facial features. The already stated actual adult age remains the primary identity attribute; the selected facial appearance affects only softness, freshness, contour definition, or natural maturity. These features remain naturally proportioned and age-coherent.";
const REFERENCE_SHEET_CONTENT_DE = "Erstelle genau eine einheitliche Charakterreferenztafel mit exakt 4 ausgewählten Ansichten derselben eindeutig erwachsenen Person: Vorderansicht, Rückansicht, linkes Profil, rechtes Profil.";
const REFERENCE_SHEET_CONTENT_EN = "Create exactly one unified character reference-sheet canvas containing exactly 4 selected views of the same clearly adult person: front view, back view, left profile, right profile.";
const REFERENCE_CAPTURE_CONTENT_DE = "authentische fotografische Referenzaufnahme mit natürlicher Optik, glaubwürdiger Sensorreaktion und realen Oberflächen. Authentische Fotografie statt CGI: keine 3D-gerenderte Anmutung, keine Kunststoff- oder Schaufensterpuppenhaut, kein synthetisch gleichförmiges Haar, keine geklonten Materialtexturen und keine identisch wiederholten Faltenmuster.";
const REFERENCE_CAPTURE_CONTENT_EN = "authentic photographic reference capture with natural optics, credible sensor response, and real-world surfaces. Authentic photography rather than CGI: no 3D-rendered appearance, plastic or mannequin-like skin, synthetically uniform hair, cloned material textures, or identically repeated wrinkle patterns.";
const REFERENCE_CONSISTENCY_CONTENT_DE = "Identität, Gesichtsgeometrie, Körperproportionen, Größe, Frisur, Kleidung und Farbgestaltung bleiben in jeder Ansicht identisch. Hautton, Augenfarbe, Haarlänge, Accessoires und Materialgestaltung bleiben konsistent. Natürliche, ansichtsabhängige Mikrovariationen bei Porensichtbarkeit, einzelnen Haarpositionen, winzigen Stofffalten, Reflexionen und Mikroschatten bleiben erhalten; sie dürfen nicht als kopierte Muster erstarren und niemals die Identität verändern.";
const REFERENCE_CONSISTENCY_CONTENT_EN = "Identity, facial geometry, body proportions, height, hairstyle, clothing, and color design remain identical in every view. Skin tone, eye color, hair length, accessories, and material design remain consistent. Preserve natural, view-dependent microvariation in pore visibility, individual hair placement, tiny fabric folds, reflections, and micro-shadows; do not freeze them into copied patterns, and never let them alter identity.";
const REFERENCE_LAYOUT_CONTENT_DE = "Verwende einen neutralen, dem Referenzzweck angemessenen Hintergrund, eine neutrale Referenzhaltung sowie gleichmäßige Beleuchtung, Kamerahöhe, Skalierung und Farbwiedergabe über alle Ansichten hinweg. Layout: gleichmäßig angeordnetes Raster.";
const REFERENCE_LAYOUT_CONTENT_EN = "Use a neutral background appropriate to the reference purpose, neutral reference stance, even lighting, camera height, scale, and color rendering across all views. Layout: evenly spaced grid.";
const REFERENCE_RESTRICTIONS_CONTENT_DE = "Keine zusätzlichen Ansichten, alternativen Identitäten, doppelten Ansichten oder nicht ausgewählten Nahaufnahmen.";
const REFERENCE_RESTRICTIONS_CONTENT_EN = "No additional views, alternative identities, duplicate views, or unselected close-ups.";
const SINGLE_REFERENCE_CONTENT_DE = "Erzeuge genau eine Front als Identitätsreferenz; keine zusätzlichen Ansichten. authentische fotografische Referenzaufnahme mit natürlicher Optik, glaubwürdiger Sensorwiedergabe und realen Oberflächen. Identität, Gesichtsgeometrie, Körperproportionen, Größe, Frisur, Kleidung und Farbgebung bleiben in allen Ansichten identisch. Natürliche Mikrovariationen in Haut, Haaren und Materialien bleiben fotografisch glaubwürdig, ohne die Identität zu verändern. Authentische Fotografie statt CGI: keine 3D-Renderoptik, keine plastikartige oder mannequinartige Haut, keine synthetisch gleichförmigen Haare, keine geklonten Materialtexturen und keine identisch wiederholten Faltenmuster. Verwende automatisch gleichmäßiges Referenzlicht und neutraler, zum Referenzzweck passender Hintergrund.";
const SINGLE_REFERENCE_CONTENT_EN = "Create exactly one front view as a identity reference; no additional views. authentic photographic reference capture with natural optics, credible sensor response, and real-world surfaces. Identity, facial geometry, body proportions, height, hairstyle, clothing, and color design remain identical in every view. Preserve photographically credible natural microvariation in skin, hair, and materials without changing identity. Authentic photography rather than CGI: no 3D-rendered appearance, plastic or mannequin-like skin, synthetically uniform hair, cloned material textures, or identically repeated wrinkle patterns. Use automatically balanced reference lighting and a neutral background appropriate to the reference purpose.";
const SUBJECT_DE = `PERSON\n${SUBJECT_CONTENT_DE}`;
const SKIN_DE = `HAUTREALISMUS & MAKE-UP\n${SKIN_CONTENT_DE}`;
const SUBJECT_EN = `SUBJECT\n${SUBJECT_CONTENT_EN}`;
const SKIN_EN = `SKIN REALISM AND MAKEUP\n${SKIN_CONTENT_EN}`;
const FACE_DE = `GESICHTSMERKMALE\n${FACE_CONTENT_DE}`;
const FACE_EN = `FACIAL FEATURES\n${FACE_CONTENT_EN}`;

const SUBJECT_PATHS = [
  "character.adult", "character.age", "character.bodyBuild", "character.chestShape", "character.chestVolume",
  "character.eyeColor", "character.gender", "character.hair.color", "character.hair.length", "character.hair.style",
  "character.hair.texture", "character.heightCentimeters", "character.lowerBody", "character.skinTone",
] as const;
const PRIMARY_SUBJECT_CONTRACT_PATHS = [
  "character.adult", "character.age", "character.bodyBuild", "character.chestShape", "character.chestVolume",
  "character.eyeColor", "character.gender", "character.hair.color", "character.hair.length",
  "character.hair.texture", "character.heightCentimeters", "character.lowerBody", "character.skinTone",
] as const;
const IDENTITY_CONSISTENCY_PATHS = [
  ...SUBJECT_PATHS,
  "character.eyeShape", "character.faceAge", "character.faceShape", "character.noseShape",
  "garment.footwear.color", "garment.footwear.kind", "garment.lower.color", "garment.lower.kind",
  "garment.upper.color", "garment.upper.kind",
] as const;
const FACE_PATHS = ["character.adult", "character.age", "character.eyeShape", "character.faceAge", "character.faceShape", "character.noseShape"] as const;
const POSE_PATHS = ["pose.expression", "pose.gaze", "pose.position"] as const;
const REFERENCE_SHEET_PATHS = ["referenceMode.enabled", "referenceMode.layout", "referenceMode.mode", "referenceMode.sheetType"] as const;
const SINGLE_REFERENCE_PATHS = ["referenceMode.enabled", "referenceMode.mode", "referenceMode.purpose", "referenceMode.singleView"] as const;

export const characterSheetSection: PromptSectionProvider = {
  id: "character-sheet",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const subjectContent = createSubjectContent(state.values, german);
    const poseContent = createPoseContent(state.values, german);
    const subjectFragment = createResolvedFragmentDraft(state, "character-sheet", "character.subject", subjectContent, SUBJECT_PATHS);
    const primarySubjectContractContent = createPrimarySubjectContractContent(state.values, german);
    const primarySubjectContractFragment = primarySubjectContractContent !== undefined
      && PRIMARY_SUBJECT_CONTRACT_PATHS.every((path) => state.trace.entries.some((entry) => entry.path === path))
      ? createResolvedFragmentDraft(
        state,
        "character-sheet",
        "character.primary-subject-contract",
        primarySubjectContractContent,
        PRIMARY_SUBJECT_CONTRACT_PATHS,
      )
      : undefined;
    const compactIdentityContent = german ? createCompactIdentityContent(state.values) : undefined;
    const compactIdentityFragment = compactIdentityContent !== undefined
      && PRIMARY_SUBJECT_CONTRACT_PATHS.every((path) => state.trace.entries.some((entry) => entry.path === path))
      ? createResolvedFragmentDraft(
        state,
        "character-sheet",
        "character.compact-identity",
        compactIdentityContent,
        PRIMARY_SUBJECT_CONTRACT_PATHS,
      )
      : undefined;
    const hairstyleContent = createHairstyleContent(state.values, german);
    const hairstyleFragment = hairstyleContent !== undefined
      && state.trace.entries.some((entry) => entry.path === "character.hair.style")
      ? createResolvedFragmentDraft(
        state,
        "character-sheet",
        "character.hairstyle",
        hairstyleContent,
        ["character.hair.style"],
      )
      : undefined;
    const identityConsistencyFragment = IDENTITY_CONSISTENCY_PATHS.every((path) => state.trace.entries.some((entry) => entry.path === path))
      ? createResolvedFragmentDraft(
        state,
        "character-sheet",
        "character.identity-consistency",
        german ? IDENTITY_CONSISTENCY_DE : IDENTITY_CONSISTENCY_EN,
        IDENTITY_CONSISTENCY_PATHS,
      )
      : undefined;
    const skinFragment = createResolvedFragmentDraft(
      state,
      "character-sheet",
      "realism.skin",
      german ? SKIN_CONTENT_DE : SKIN_CONTENT_EN,
      german ? ["character.skinTone"] : ["character.hair.color", "character.hair.length", "character.hair.style", "character.hair.texture", "character.skinTone"],
    );
    const poseFragment = createResolvedFragmentDraft(state, "character-sheet", "pose.action", poseContent, POSE_PATHS);
    const compactPoseFragment = german
      ? createResolvedFragmentDraft(
        state,
        "character-sheet",
        "pose.compact-action",
        createCompactPoseContent(state.values),
        POSE_PATHS,
      )
      : undefined;
    const faceFragment = createResolvedFragmentDraft(state, "character-sheet", "character.facial-features", german ? FACE_CONTENT_DE : FACE_CONTENT_EN, FACE_PATHS);
    const referenceMode = objectAt(state.values, "referenceMode");
    const referenceFragments = referenceMode?.enabled === true
      && referenceMode.mode === "referenceMode.character_sheet"
      && typeof referenceMode.sheetType === "string"
      && typeof referenceMode.layout === "string"
      ? [
        createResolvedFragmentDraft(state, "character-sheet", "character.reference-sheet", german ? REFERENCE_SHEET_CONTENT_DE : REFERENCE_SHEET_CONTENT_EN, REFERENCE_SHEET_PATHS),
        createResolvedFragmentDraft(state, "character-sheet", "character.reference-capture", german ? REFERENCE_CAPTURE_CONTENT_DE : REFERENCE_CAPTURE_CONTENT_EN, REFERENCE_SHEET_PATHS),
        createResolvedFragmentDraft(state, "character-sheet", "character.reference-consistency", german ? REFERENCE_CONSISTENCY_CONTENT_DE : REFERENCE_CONSISTENCY_CONTENT_EN, REFERENCE_SHEET_PATHS),
        createResolvedFragmentDraft(state, "character-sheet", "character.reference-layout", german ? REFERENCE_LAYOUT_CONTENT_DE : REFERENCE_LAYOUT_CONTENT_EN, REFERENCE_SHEET_PATHS),
        createResolvedFragmentDraft(state, "character-sheet", "restrictions.reference-views", german ? REFERENCE_RESTRICTIONS_CONTENT_DE : REFERENCE_RESTRICTIONS_CONTENT_EN, REFERENCE_SHEET_PATHS),
      ]
      : [];
    const singleReferenceFragment = referenceMode?.enabled === true
      && referenceMode.mode === "referenceMode.single_reference"
      && referenceMode.purpose === "referencePurpose.identity"
      && referenceMode.singleView === "referenceView.front"
      ? createResolvedFragmentDraft(
        state,
        "character-sheet",
        "character.single-reference",
        german ? SINGLE_REFERENCE_CONTENT_DE : SINGLE_REFERENCE_CONTENT_EN,
        SINGLE_REFERENCE_PATHS,
      )
      : undefined;
    const subject = createResolvedSectionDraft(
      state,
      "character-sheet",
      `${german ? "PERSON" : "SUBJECT"}\n${subjectContent}\n`,
      [
        subjectFragment,
        ...(primarySubjectContractFragment === undefined ? [] : [primarySubjectContractFragment]),
        ...(compactIdentityFragment === undefined ? [] : [compactIdentityFragment]),
        ...(hairstyleFragment === undefined ? [] : [hairstyleFragment]),
        ...(identityConsistencyFragment === undefined ? [] : [identityConsistencyFragment]),
        ...referenceFragments,
        ...(singleReferenceFragment === undefined ? [] : [singleReferenceFragment]),
      ],
    );
    const skin = createResolvedSectionDraft(state, "character-sheet", german ? SKIN_DE : SKIN_EN, [skinFragment]);
    const pose = createResolvedSectionDraft(state, "character-sheet", `${german ? "POSE & AKTION" : "POSE AND ACTION"}\n${poseContent}`, [poseFragment]);
    const poseWithCompact = compactPoseFragment === undefined
      ? pose
      : createResolvedSectionDraft(
        state,
        "character-sheet",
        `${german ? "POSE & AKTION" : "POSE AND ACTION"}\n${poseContent}`,
        [poseFragment, compactPoseFragment],
      );
    const face = createResolvedSectionDraft(state, "character-sheet", german ? FACE_DE : FACE_EN, [faceFragment]);
    return [
      { ...subject, slotId: "character-sheet-a-subject" },
      { ...skin, slotId: "character-sheet-b-skin" },
      { ...poseWithCompact, slotId: "character-sheet-c-pose" },
      { ...face, slotId: "character-sheet-d-face" },
    ];
  },
};

function createPoseContent(values: unknown, german: boolean): string {
  const expression = objectAt(values, "pose")?.expression;
  if (expression === "expression.relaxed") return german ? POSE_RELAXED_DE : POSE_RELAXED_EN;
  if (expression === "expression.laughing" || expression === "natürlich lachend") return german ? POSE_LAUGHING_DE : POSE_LAUGHING_EN;
  throw new Error(`Unsupported resolved pose.expression: ${String(expression)}`);
}

function createCompactPoseContent(values: unknown): string {
  const pose = objectAt(values, "pose");
  const position = pose?.position === "pose.standing"
    ? "frontal und aufrecht stehend, Gewicht locker auf einem Bein"
    : String(pose?.position);
  const gaze = pose?.gaze === "gaze.left_camera"
    ? "leicht links an der Kamera vorbei"
    : String(pose?.gaze);
  const expression = pose?.expression === "expression.relaxed"
    ? "mit entspanntem Ausdruck"
    : pose?.expression === "expression.laughing" || pose?.expression === "natürlich lachend"
      ? "natürlich lachend"
      : String(pose?.expression);
  return `${position}, ${gaze}, ${expression}`;
}

function createSubjectContent(values: unknown, german: boolean): string {
  const character = objectAt(values, "character");
  if (character === undefined) return german ? SUBJECT_CONTENT_DE : SUBJECT_CONTENT_EN;
  const age = typeof character.age === "number" ? character.age : 21;
  const height = typeof character.heightCentimeters === "number" ? character.heightCentimeters : 160;
  const bodyBuild = character.bodyBuild === "bodyBuild.slim_balanced"
    ? (german ? "schlanke, ausgewogene" : "slim and balanced")
    : String(character.bodyBuild);
  const chestVolume = character.chestVolume === "chestVolume.very_full"
    ? (german ? "sehr großen" : "a very full chest volume")
    : character.chestVolume === "chestVolume.average"
      ? (german ? "durchschnittlich großen" : "an average chest volume")
      : String(character.chestVolume);
  const chestShape = character.chestShape === "chestShape.natural_balanced"
    ? (german ? "natürlich ausgewogenen" : "a naturally balanced chest shape")
    : String(character.chestShape);
  const lowerBody = character.lowerBody === "lowerBody.softly_rounded"
    ? (german ? "einer weich gerundeten Hüftsilhouette" : "a softly rounded hip silhouette")
    : character.lowerBody === "lowerBody.balanced"
      ? (german ? "einer ausgewogenen Hüftproportionen" : "balanced hip proportions")
      : String(character.lowerBody);
  if (german) {
    return `Die dargestellte Person ist eine erwachsene Frau, ${age} Jahre alt und ${height} cm groß. Sie hat eine ${bodyBuild} Figur mit einem ${chestVolume} Brustvolumen, einer ${chestShape} Brustform und ${lowerBody}. Die ausgewählten Brustproportionen bleiben anatomisch plausibel. Gewichtsverteilung, Haltung, Schwerkraft, natürliches Weichgewebeverhalten, Silhouette sowie Spannung und Kompression der Kleidung reagieren physikalisch glaubwürdig auf Körperform, Pose und Bewegung. Sie hat einen hellen, warmen Hautton und graublaue Augen. Sie trägt brustlange, blonde, natürlich wellige Haare, die offen getragen werden.`;
  }
  return `The subject is an adult woman, ${age} years old and ${height} cm tall. She has a ${bodyBuild} figure, ${chestVolume}, ${chestShape}, and ${lowerBody}. Maintain physically plausible anatomy consistent with the selected chest proportions. Natural weight distribution, posture, gravity, soft tissue behavior, silhouette, garment tension, compression, and body mechanics remain physically believable from every camera angle. She has fair skin with warm undertones and gray-blue eyes. Her chest-length blonde naturally wavy hair is worn loose.`;
}

function createPrimarySubjectContractContent(values: unknown, german: boolean): string | undefined {
  const character = objectAt(values, "character");
  const hair = objectAt(character, "hair");
  if (character?.adult !== true || typeof character.age !== "number" || typeof character.heightCentimeters !== "number" || hair === undefined) {
    return undefined;
  }
  const gender = localized(character.gender, german, { "gender.woman": ["Frau", "woman"] });
  const bodyBuild = localized(character.bodyBuild, german, { "bodyBuild.slim_balanced": ["Schlank & ausgewogen", "slim and balanced figure"] });
  const chestVolume = localized(character.chestVolume, german, {
    "chestVolume.average": ["Durchschnittlich Brustvolumen", "average chest volume"],
    "chestVolume.very_full": ["Sehr voll Brustvolumen", "very full chest volume"],
  });
  const chestShape = localized(character.chestShape, german, { "chestShape.natural_balanced": ["Natürlich ausgewogen Brustform", "naturally balanced chest shape"] });
  const lowerBody = localized(character.lowerBody, german, {
    "lowerBody.balanced": ["ausgewogenen Hüftproportionen", "balanced hip proportions"],
    "lowerBody.softly_rounded": ["weich gerundete Hüftsilhouette", "softly rounded hip silhouette"],
  });
  const skinTone = localized(character.skinTone, german, { "skinTone.fair_warm": ["heller, warmer Hautton", "fair skin with warm undertones"] });
  const eyeColor = localized(character.eyeColor, german, { "eyeColor.gray_blue": ["graublaue Augen", "gray-blue eyes"] });
  const hairLength = localized(hair.length, german, { "hairLength.chest": ["brustlange", "chest-length"] });
  const hairColor = localized(hair.color, german, { "hairColor.blonde": ["blonde", "blonde"] });
  const hairTexture = localized(hair.texture, german, { "hairTexture.natural_waves": ["natürlich wellige Haare", "naturally wavy hair"] });
  const required = [gender, bodyBuild, chestVolume, chestShape, lowerBody, skinTone, eyeColor, hairLength, hairColor, hairTexture];
  if (required.some((value) => value === undefined)) return undefined;
  if (german) {
    return `Erwachsene ${gender}, ${character.age} Jahre alt und ${character.heightCentimeters} cm groß; ${bodyBuild}, ${chestVolume}, ${chestShape}, ${lowerBody}. ${skinTone}, ${eyeColor}; ${hairLength} ${hairColor} ${hairTexture}. Die ausgewählten Körperproportionen exakt beibehalten; Anatomie, Schwerkraft und Stoffspannung bleiben glaubwürdig.`;
  }
  return `Adult ${gender}, ${character.age} years old and ${character.heightCentimeters} cm tall; ${bodyBuild}, ${chestVolume}, ${chestShape}, and ${lowerBody}. ${skinTone}, ${eyeColor}, and ${hairLength} ${hairColor} ${hairTexture}. Preserve the exact selected body proportions; anatomy, gravity, and garment tension remain believable.`;
}

function createCompactIdentityContent(values: unknown): string | undefined {
  const character = objectAt(values, "character");
  const hair = objectAt(character, "hair");
  if (character?.adult !== true || typeof character.age !== "number" || typeof character.heightCentimeters !== "number" || hair === undefined) {
    return undefined;
  }
  const gender = localized(character.gender, true, { "gender.woman": ["Frau", "woman"] });
  const bodyBuild = localized(character.bodyBuild, true, { "bodyBuild.slim_balanced": ["Schlank & ausgewogen", "slim and balanced"] });
  const chestVolume = localized(character.chestVolume, true, {
    "chestVolume.average": ["Durchschnittlich", "average"],
    "chestVolume.very_full": ["Sehr voll", "very full"],
  });
  const chestShape = localized(character.chestShape, true, { "chestShape.natural_balanced": ["Natürlich ausgewogen", "naturally balanced"] });
  const lowerBody = localized(character.lowerBody, true, {
    "lowerBody.balanced": ["ausgewogenen Hüftproportionen", "balanced hip proportions"],
    "lowerBody.softly_rounded": ["weich gerundete Hüftsilhouette", "softly rounded hip silhouette"],
  });
  const skinTone = localized(character.skinTone, true, { "skinTone.fair_warm": ["heller, warmer Hautton", "fair skin with warm undertones"] });
  const eyeColor = localized(character.eyeColor, true, { "eyeColor.gray_blue": ["graublaue Augen", "gray-blue eyes"] });
  const hairLength = localized(hair.length, true, { "hairLength.chest": ["brustlange", "chest-length"] });
  const hairColor = localized(hair.color, true, { "hairColor.blonde": ["blonde", "blonde"] });
  const hairTexture = localized(hair.texture, true, { "hairTexture.natural_waves": ["natürlich wellige", "naturally wavy"] });
  const required = [gender, bodyBuild, chestVolume, chestShape, lowerBody, skinTone, eyeColor, hairLength, hairColor, hairTexture];
  if (required.some((value) => value === undefined)) return undefined;
  return `Die dargestellte Person, adult ${gender}, age ${character.age}, ${character.heightCentimeters} cm, ${bodyBuild}, ${chestVolume}, ${chestShape}, ${lowerBody}, ${skinTone}, ${eyeColor}, ${hairLength} ${hairColor} ${hairTexture} hair`;
}

function createHairstyleContent(values: unknown, german: boolean): string | undefined {
  const style = objectAt(objectAt(values, "character"), "hair")?.style;
  return localized(style, german, { "hairStyle.loose": ["offen getragene", "loose"] });
}

function localized(
  value: unknown,
  german: boolean,
  translations: Readonly<Record<string, readonly [german: string, english: string]>>,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const translation = translations[value];
  return translation?.[german ? 0 : 1];
}

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[key];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? child as Readonly<Record<string, unknown>>
    : undefined;
}
