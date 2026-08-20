import type { JsonPromptLanguage, JsonPromptProjection } from "../../domain/contracts/prompt/json-projection";
import type { JsonValue, PromptDocument, PromptFragment, PromptSection } from "../../domain/contracts/prompt/prompt-document";
import type { ResolvedState } from "../../domain/contracts/resolved-state/resolved-state";
import { JSON_LEGACY_BRAND_GARMENT_IDS, jsonLegacyCatalogEntry, jsonLegacyLabel } from "./json-legacy-catalog";

const DEFAULT_NEGATIVE_PROMPT = Object.freeze([
  "anatomy errors", "duplicate limbs", "distorted proportions", "plastic skin", "over-smoothed skin",
  "deformed hands", "extra fingers", "text", "watermark", "logo", "caption", "signature", "identity drift",
]);
const AUTHORIZED_NEGATIVE_PROMPT = Object.freeze([
  "anatomy errors", "duplicate limbs", "distorted proportions", "plastic skin", "over-smoothed skin",
  "deformed hands", "extra fingers", "watermark", "caption", "signature", "identity drift", "unrelated text",
  "additional logos", "branding on unrequested garments", "watermark",
]);
const REFERENCE_VIEWS = Object.freeze([
  "referenceView.front", "referenceView.back", "referenceView.left_profile", "referenceView.right_profile",
]);
const CAMERA_SECTION_SUFFIX_DE = "Eine einzige durchgehende Ganzkörperaufnahme; keine zusätzlichen Nahaufnahmen, Ausschnitte oder Wiederholungen derselben Person. Priorisiere vollständige Körperhaltung, beide Füße, Outfit und räumlichen Kontext. Haut- und Haardetails bleiben natürlich sichtbar, aber nicht als Nahaufnahme inszeniert. Die Aufnahme soll wie ein natürlich eingefangenes Smartphone-Foto wirken und nicht wie eine sorgfältig inszenierte Modekampagne.";
const SUBJECT_APPEARANCE_DE = "Sie hat einen hellen, warmen Hautton und graublaue Augen. Sie trägt brustlange, blonde, natürlich wellige Haare, die offen getragen werden.";
const PHOTO_REFERENCE_CHARACTER = Object.freeze({
  style: "referenceStyle.photographic",
  capture: {
    de: "authentische fotografische Referenzaufnahme mit naturaler Optik, glaubwürdiger Sensorwiedergabe und realen Oberflächen",
    en: "authentic photographic reference capture with natural optics, credible sensor response, and real-world surfaces",
  },
  identity: {
    de: "Identität, Gesichtsgeometrie, Körperproportionen, Größe, hairstyle, Kleidung und Farbgebung bleiben in allen Ansichten identisch.",
    en: "Identity, facial geometry, body proportions, height, hairstyle, clothing, and color design remain identical in every view.",
  },
  microVariation: {
    de: "naturale, blickwinkelabhängige Mikrovariationen bei Porensichtbarkeit, einzelnen Haaren, smallen Stofffalten, Reflexionen und Mikroschatten bleiben erhalten; sie dürfen nicht als kopiertes Muster erstarren und verändern niemals die Identität.",
    en: "Preserve natural, view-dependent microvariation in pore visibility, individual hair placement, tiny fabric folds, reflections, and micro-shadows; do not freeze them into copied patterns, and never let them alter identity.",
  },
  antiCgi: {
    de: "Authentische Fotografie statt CGI: keine 3D-Renderoptik, keine plastikartige oder mannequinartige Haut, keine synthetisch gleichförmigen Haare, keine geklonten Materialtexturen und keine identisch wiederholten Faltenmuster.",
    en: "Authentic photography rather than CGI: no 3D-rendered appearance, plastic or mannequin-like skin, synthetically uniform hair, cloned material textures, or identically repeated wrinkle patterns.",
  },
});

export class JsonPromptProjectionBuilder {
  build(document: PromptDocument, state: ResolvedState): JsonPromptProjection {
    const language = projectionLanguage(state);
    const referenceMode = objectAt(state.values, "referenceMode");
    const characterSheetMode = referenceMode?.enabled === true && referenceMode.mode === "referenceMode.character_sheet";
    const mode = characterSheetMode ? "characterSheet" as const : "normal" as const;
    const projection: JsonPromptProjection = {
      documentId: document.id,
      mode,
      language,
      prompt: characterSheetMode
        ? buildCharacterSheetPrompt(document, language)
        : buildNormalPrompt(document, state, language),
      ...(characterSheetMode ? {} : { negativePrompt: negativePrompt(state) }),
      sections: buildSections(document, state, language, characterSheetMode),
      ...(characterSheetMode ? {} : { metadata: buildMetadata(state, language) }),
      structuredSelections: buildStructuredSelections(state),
      adaptive: buildAdaptive(state, language),
      resolvedState: buildLegacyResolvedState(state),
      ...(characterSheetMode ? {
        characterSheet: buildCharacterSheet(),
        photographicCapture: PHOTO_REFERENCE_CHARACTER,
      } : {}),
      ...(!characterSheetMode && buildInstructions(document) !== undefined
        ? { instructions: buildInstructions(document) }
        : {}),
      trace: document.trace,
    };
    return deepFreezeProjection(projection);
  }
}

function projectionLanguage(state: ResolvedState): JsonPromptLanguage {
  const value = allowlistedFact(state, "promptLanguage");
  if (value === "Deutsch") return "de";
  if (value === "English" || value === "Englisch") return "en";
  throw new Error(`JSON_PROJECTION_LANGUAGE_UNSUPPORTED ${String(value)}`);
}

function buildNormalPrompt(document: PromptDocument, state: ResolvedState, language: JsonPromptLanguage): string {
  const german = language === "de";
  const selfie = hasFragment(document, "selfie.capture");
  const openLayer = hasFragment(document, "garment.upper-body") && hasFragment(document, "garment.layering");
  const organza = readPath(state.values, "material.upper") === "Organza";
  const blocks: string[] = [];

  blocks.push(`${german ? "KAMERA / PERSPEKTIVE" : "CAMERA / PERSPECTIVE"}\n${fragmentText(document, selfie ? "selfie.capture" : "camera.capture")}`);
  if (openLayer && organza) {
    blocks.push(`${german ? "OBERKÖRPER-SCHICHTREGEL" : "UPPER-BODY LAYER RULE"}\n${fragmentText(document, "garment.upper-body")} ${fragmentText(document, "garment.layering")}`);
  }
  blocks.push(sectionBySlot(document, "character-sheet-a-subject").text.trim());
  blocks.push(sectionBySlot(document, "character-sheet-b-skin").text.trim());
  if (openLayer && !organza) {
    blocks.push(`${german ? "OUTFIT & ACCESSOIRES" : "OUTFIT AND ACCESSORIES"}\n${german ? "OBERKÖRPER-SCHICHTVERTRAG" : "UPPER-BODY LAYER CONTRACT"}\n${fragmentText(document, "garment.upper-body")} ${fragmentText(document, "garment.layering")}\n${fragmentText(document, "garment.outfit")} ${fragmentText(document, "garment.material-behaviour")}`);
  } else {
    blocks.push(sectionBySlot(document, "garment").text.trim());
  }
  blocks.push(sectionBySlot(document, "character-sheet-c-pose").text.trim());
  blocks.push(sectionBySlot(document, "scene-lighting").text.trim());
  blocks.push(sectionBySlot(document, "model-behaviour").text.trim());
  if (selfie) blocks.push(`${german ? "SELFIE-AUFNAHME" : "SELFIE CAPTURE"}\n${fragmentText(document, "selfie.geometry")}`);
  if (hasFragment(document, "additional-person.person")) {
    blocks.push(`${german ? "ZUSÄTZLICHE PERSON" : "ADDITIONAL PERSON"}\n${fragmentText(document, "additional-person.person")}`);
  }
  blocks.push(personRestriction(document));
  return blocks.join("\n\n");
}

function buildCharacterSheetPrompt(document: PromptDocument, language: JsonPromptLanguage): string {
  const german = language === "de";
  const content = [
    fragmentText(document, "character.subject"),
    fragmentText(document, "garment.outfit"),
    fragmentText(document, "garment.material-behaviour"),
    fragmentText(document, "character.reference-consistency"),
    fragmentText(document, "character.reference-layout"),
    `Material physics: ${fragmentText(document, "material.physics")}`,
    `Realism: ${fragmentText(document, "realism.adaptive")}`,
    fragmentText(document, "restrictions.reference-views"),
  ].join(" ");
  return [
    `${german ? "CHARAKTER-REFERENZTAFEL" : "CHARACTER REFERENCE SHEET"}\n${fragmentText(document, "character.reference-sheet")}`,
    `${german ? "FOTOGRAFISCHE AUFNAHME" : "PHOTOGRAPHIC CAPTURE"}\n${fragmentText(document, "character.reference-capture")}`,
    content,
    personRestriction(document),
  ].join("\n\n");
}

function buildInstructions(document: PromptDocument): readonly string[] | undefined {
  const blocks: string[] = [];
  if (hasFragment(document, "selfie.geometry")) blocks.push(`SELFIE CAPTURE\n${fragmentText(document, "selfie.geometry")}`);
  if (hasFragment(document, "additional-person.person")) blocks.push(`ADDITIONAL PERSON\n${fragmentText(document, "additional-person.person")}`);
  return blocks.length === 0 ? undefined : [blocks.join("\n\n")];
}

function negativePrompt(state: ResolvedState): readonly string[] {
  return objectAt(state.values, "brand") === undefined ? DEFAULT_NEGATIVE_PROMPT : AUTHORIZED_NEGATIVE_PROMPT;
}

function buildSections(
  document: PromptDocument,
  state: ResolvedState,
  language: JsonPromptLanguage,
  characterSheetMode: boolean,
): JsonValue {
  const age = requiredNumber(objectAt(state.values, "character"), "age", "character.age");
  const restrictions = personRestriction(document);
  const facialFeatures = language === "de"
    ? `klar erwachsene, ausgewogene Gesichtszüge; tatsächliches Erwachsenenalter: ${age}`
    : `clearly adult, balanced facial features; actual adult age: ${age}`;
  const captureAppearance = language === "de"
    ? `natürlicher Haut-Look mit glaubwürdiger Struktur; natürlicher, authentischer fotografischer Charakter; ${readPath(state.values, "camera.photoLook") === "photoLook.warm" ? "warme Farbbalance mit sanften goldenen Tönen" : "natürliche Farbwiedergabe und ausgewogener Kontrast"}`
    : "natural skin appearance with believable texture; natural, authentic photographic character; natural color rendering and balanced contrast";
  if (characterSheetMode) return { facialFeatures, captureAppearance, restrictions };

  const german = language === "de";
  const subject = `${fragmentText(document, "character.subject")}${german ? ` ${SUBJECT_APPEARANCE_DE}` : ""}`;
  const cameraCapture = fragmentText(document, hasFragment(document, "selfie.capture") ? "selfie.capture" : "camera.capture");
  const camera = german && readPath(state.values, "camera.framing") === "framing.whole_person"
    ? `${cameraCapture} ${CAMERA_SECTION_SUFFIX_DE}`
    : cameraCapture;
  const outfit = `${fragmentText(document, "garment.outfit")} ${fragmentText(document, "garment.material-behaviour")}`;
  const environmentParts = [fragmentText(document, "scene.environment")];
  if (!german) environmentParts.push(fragmentText(document, "scene.natural-details"));
  environmentParts.push(fragmentText(document, "lighting.capture"), fragmentText(document, "lighting.white-balance"));
  const humanDetail = german
    ? `${fragmentText(document, "realism.skin")} ${fragmentText(document, "realism.hair-details")}`
    : fragmentText(document, "realism.skin");
  return {
    subject,
    camera,
    pose: fragmentText(document, "pose.action"),
    outfit,
    environment: environmentParts.join(" "),
    humanDetail,
    restrictions,
    facialFeatures,
    captureAppearance,
    ...(hasFragment(document, "garment.upper-body") ? {
      upperBodyLayerContract: `${fragmentText(document, "garment.upper-body")} ${fragmentText(document, "garment.layering")}`,
    } : {}),
  };
}

function buildMetadata(state: ResolvedState, language: JsonPromptLanguage): JsonValue {
  const camera = objectAtRequired(state.values, "camera");
  const pose = objectAtRequired(state.values, "pose");
  const scene = objectAtRequired(state.values, "scene");
  const selfie = objectAt(state.values, "selfieMode")?.enabled === true;
  const framing = jsonLegacyCatalogEntry("framing", requiredString(camera, "framing", "camera.framing"));
  const device = jsonLegacyCatalogEntry("device", requiredString(camera, "device", "camera.device"));
  const lens = jsonLegacyCatalogEntry("lens", requiredString(camera, "lens", "camera.lens"));
  const poseEntry = jsonLegacyCatalogEntry("pose", requiredString(pose, "position", "pose.position"));
  const location = jsonLegacyCatalogEntry("location", requiredString(scene, "location", "scene.location"));
  const area = jsonLegacyCatalogEntry("locationArea", requiredString(scene, "area", "scene.area"));
  const lensId = selfie ? "selfieCamera.front" : lens.id;
  const lensLabel = selfie
    ? (language === "de" ? "Smartphone-Frontkamera" : "front-facing smartphone camera")
    : jsonLegacyLabel(lens, language);
  return {
    schemaVersion: 4,
    selectionIds: {
      framing: framing.id,
      camera: device.id,
      lens: lens.id,
      pose: poseEntry.id,
      location: location.id,
      locationArea: area.id,
    },
    framing: {
      id: framing.id,
      label: jsonLegacyLabel(framing, language),
      mode: requiredString(camera, "framing", "camera.framing") === "framing.whole_person" ? "fullBody" : "portrait",
    },
    camera: {
      deviceId: device.id,
      device: jsonLegacyLabel(device, language),
      lensId,
      lens: lensLabel,
    },
    pose: { id: poseEntry.id, label: jsonLegacyLabel(poseEntry, language) },
    environment: {
      locationId: location.id,
      location: jsonLegacyLabel(location, language),
      areaId: area.id,
      area: jsonLegacyLabel(area, language),
    },
    brands: buildBrandMetadata(state, language),
  };
}

function buildBrandMetadata(state: ResolvedState, language: JsonPromptLanguage): JsonValue {
  const brand = objectAt(state.values, "brand");
  if (brand === undefined) return [];
  const allowedGarment = requiredString(brand, "allowedGarment", "brand.allowedGarment");
  if (allowedGarment !== "upper" && allowedGarment !== "footwear") {
    throw new Error(`JSON_BRAND_GARMENT_UNSUPPORTED ${allowedGarment}`);
  }
  const visibility = requiredString(brand, "visibility", "brand.visibility");
  const placement = requiredString(brand, "placement", "brand.placement");
  return [{
    garmentId: JSON_LEGACY_BRAND_GARMENT_IDS[allowedGarment],
    brand: requiredString(brand, "name", "brand.name"),
    visibility: language === "en" && visibility === "Deutlich sichtbar" ? "clearly visible" : visibility,
    placement: language === "en" && placement === "Schuhseite / Zunge" ? "shoe side or tongue" : placement,
    ...(typeof brand.model === "string" ? { model: brand.model } : {}),
  }];
}

function buildStructuredSelections(state: ResolvedState): JsonValue {
  const character = objectAtRequired(state.values, "character");
  const hair = objectAtRequired(character, "hair");
  const camera = objectAtRequired(state.values, "camera");
  const pose = objectAtRequired(state.values, "pose");
  const selfie = objectAt(state.values, "selfieMode")?.enabled === true;
  const lowerCategoryFact = allowlistedFact(state, "lowerGarmentCategoryId");
  const skirtLengthFact = allowlistedFact(state, "skirtLengthId");
  const lowerCategory = typeof lowerCategoryFact === "string" ? lowerCategoryFact : "lowerGarment.pants";
  const skirtLength = typeof skirtLengthFact === "string" ? skirtLengthFact : "skirtLength.midi";
  const openUpperLayer = objectAt(state.values, "garment")?.open === true;
  const stableLensFact = allowlistedFact(state, "lensV5Id");
  return {
    schemaVersion: 5,
    appearance: {
      skinTone: requiredString(character, "skinTone", "character.skinTone"),
      hairLength: requiredString(hair, "length", "character.hair.length"),
      hairStyle: requiredString(hair, "style", "character.hair.style"),
      faceShape: requiredString(character, "faceShape", "character.faceShape"),
      eyeShape: requiredString(character, "eyeShape", "character.eyeShape"),
      nose: requiredString(character, "noseShape", "character.noseShape"),
      faceAge: requiredString(character, "faceAge", "character.faceAge"),
      skinLook: "skinLook.natural",
    },
    camera: {
      framing: selfie ? "framing.upper_body" : requiredString(camera, "framing", "camera.framing"),
      detailTarget: "detailTarget.face",
      device: selfie ? "device.smartphone" : requiredString(camera, "device", "camera.device"),
      lens: selfie
        ? "selfieCamera.front"
        : typeof stableLensFact === "string"
          ? stableLensFact
          : "lens.smart_main",
      character: "imageCharacter.natural",
      look: requiredString(camera, "photoLook", "camera.photoLook"),
      ...(selfie ? { captureMode: "selfie.front" } : {}),
    },
    pose: {
      position: requiredString(pose, "position", "pose.position"),
      gaze: requiredString(pose, "gaze", "pose.gaze"),
      expression: requiredString(pose, "expression", "pose.expression"),
    },
    clothing: {
      lowerCategory,
      skirtModel: "skirtModel.model_0",
      skirtLength,
      shortsModel: "shortsModel.model_0",
      shortsLength: "shortsLength.short",
      ...(openUpperLayer ? {
        upperLayerMode: "exclusive-single-upper-garment",
        selectedUpperGarments: ["tshirt"],
      } : {}),
    },
  };
}

function buildAdaptive(state: ResolvedState, language: JsonPromptLanguage): JsonValue {
  const camera = objectAtRequired(state.values, "camera");
  const realism = objectAt(state.values, "realism");
  const level = typeof realism?.level === "string" ? realism.level : "realism.standard";
  const result: Record<string, JsonValue> = { schemaVersion: 6 };
  const materialEngine = buildAdaptiveMaterialEngine(state);
  if (materialEngine.length > 0) result.materialEngine = materialEngine;
  result.realismEngine = {
    level,
    framingMode: requiredString(camera, "framing", "camera.framing") === "framing.whole_person" ? "fullBody" : "upperBody",
  };
  const referenceMode = objectAt(state.values, "referenceMode");
  if (referenceMode?.enabled === true && typeof referenceMode.mode === "string") {
    const characterSheet = referenceMode.mode === "referenceMode.character_sheet";
    const photo = characterSheet ? PHOTO_REFERENCE_CHARACTER : singleReferencePhoto(language);
    result.referenceMode = {
      enabled: true,
      mode: characterSheet ? "character_sheet" : "single_reference",
      style: "referenceStyle.photographic",
      views: characterSheet ? REFERENCE_VIEWS : ["referenceView.front"],
      layout: characterSheet ? "referenceLayout.grid" : "referenceLayout.auto",
      consistency: "referenceConsistency.high",
    };
    result.photographicReference = photo;
  }
  return result;
}

function buildAdaptiveMaterialEngine(state: ResolvedState): readonly JsonValue[] {
  const material = objectAt(state.values, "material");
  const rows: JsonValue[] = [];
  const upper = objectAt(material, "upperPresentation");
  if (upper !== undefined) rows.push(materialPresentationRow("tshirt", upper));
  const lower = objectAt(material, "lowerPresentation");
  if (lower !== undefined) rows.push(materialPresentationRow("pants", lower));
  return rows;
}

function materialPresentationRow(garment: string, presentation: Readonly<Record<string, unknown>>): JsonValue {
  return [
    garment,
    requiredString(presentation, "opacity", `material.${garment}.opacity`),
    requiredString(presentation, "presentation", `material.${garment}.presentation`),
    requiredString(presentation, "realism", `material.${garment}.realism`),
    requiredString(presentation, "surface", `material.${garment}.surface`),
  ];
}

function buildLegacyResolvedState(state: ResolvedState): JsonValue {
  const additionalPerson = readPath(state.values, "scene.additionalPerson") === true;
  const selfie = objectAt(state.values, "selfieMode")?.enabled === true;
  const lowerCategory = allowlistedFact(state, "lowerGarmentCategoryId");
  const openUpperLayer = objectAt(state.values, "garment")?.open === true;
  const resolutions = buildResolutionMarkers(state);
  return {
    version: "V500.6.6-resolved-state-1",
    peopleCount: additionalPerson ? 2 : 1,
    cameraMode: selfie ? "selfie.front" : "external-camera",
    activeLowerGarment: lowerCategory === "lowerGarment.skirt" ? "skirt" : lowerCategory === "lowerGarment.shorts" ? "shorts" : "pants",
    ...(resolutions.length === 0 ? {} : { resolutions }),
    upperBodyLayerCount: 1,
    upperLayerMode: openUpperLayer ? "exclusive-single-upper-garment" : "low-risk-single-upper-garment",
  };
}

function buildResolutionMarkers(state: ResolvedState): readonly string[] {
  const markers: string[] = [];
  const lens = allowlistedFact(state, "lens");
  const lensV5Id = allowlistedFact(state, "lensV5Id");
  if (lens === "85-mm-Porträtobjektiv" && lensV5Id === undefined && readPath(state.values, "camera.lens") === "lens.portrait_85mm") {
    markers.push("LEGACY_VALUE_TO_STABLE_ID");
  }
  const photoLook = allowlistedFact(state, "photoLook");
  const photoLookV5Id = allowlistedFact(state, "photoLookV5Id");
  if (photoLook === "Klar, aber natürlich" && photoLookV5Id === undefined && readPath(state.values, "camera.photoLook") === "photoLook.warm") {
    markers.push("LEGACY_VALUE_TO_STABLE_ID");
  }
  const expression = allowlistedFact(state, "expression");
  const expressionV5Id = allowlistedFact(state, "expressionV5Id");
  if (expression === "mit neutralem, ruhigem Ausdruck" && expressionV5Id === undefined && readPath(state.values, "pose.expression") === "expression.relaxed") {
    markers.push("STABLE_ID_TO_LEGACY_VALUE");
  }
  return [...new Set(markers)];
}

function buildCharacterSheet(): JsonValue {
  return {
    style: "referenceStyle.photographic",
    views: REFERENCE_VIEWS,
    layout: "referenceLayout.grid",
    background: "referenceBackground.auto",
    consistency: "referenceConsistency.high",
    labeling: "referenceLabel.none",
  };
}

function singleReferencePhoto(language: JsonPromptLanguage): JsonValue {
  if (language === "en") {
    return {
      ...PHOTO_REFERENCE_CHARACTER,
      microVariation: {
        de: "naturale Mikrovariationen in Haut, Haaren und Materialien bleiben fotografisch glaubwürdig, ohne die Identität zu verändern.",
        en: "Preserve photographically credible natural microvariation in skin, hair, and materials without changing identity.",
      },
    };
  }
  return {
    ...PHOTO_REFERENCE_CHARACTER,
    capture: {
      de: "authentische fotografische Referenzaufnahme mit natürlicher Optik, glaubwürdiger Sensorwiedergabe und realen Oberflächen",
      en: PHOTO_REFERENCE_CHARACTER.capture.en,
    },
    identity: {
      de: "Identität, Gesichtsgeometrie, Körperproportionen, Größe, Frisur, Kleidung und Farbgebung bleiben in allen Ansichten identisch.",
      en: PHOTO_REFERENCE_CHARACTER.identity.en,
    },
    microVariation: {
      de: "Natürliche Mikrovariationen in Haut, Haaren und Materialien bleiben fotografisch glaubwürdig, ohne die Identität zu verändern.",
      en: "Preserve photographically credible natural microvariation in skin, hair, and materials without changing identity.",
    },
  };
}

function personRestriction(document: PromptDocument): string {
  return hasFragment(document, "restrictions.additional-people-authorized")
    ? fragmentText(document, "restrictions.additional-people-authorized")
    : fragmentText(document, "restrictions.additional-people");
}

function fragmentText(document: PromptDocument, id: string): string {
  const fragment = findFragment(document, id);
  if (fragment === undefined) throw new Error(`JSON_PROJECTION_FRAGMENT_MISSING ${id}`);
  return fragment.text;
}

function findFragment(document: PromptDocument, id: string): PromptFragment | undefined {
  for (const section of document.sections) {
    const fragment = section.fragments.find((candidate) => candidate.id === id);
    if (fragment !== undefined) return fragment;
  }
  return undefined;
}

function hasFragment(document: PromptDocument, id: string): boolean {
  return findFragment(document, id) !== undefined;
}

function sectionBySlot(document: PromptDocument, slotId: string): PromptSection {
  const section = document.sections.find((candidate) => candidate.slotId === slotId);
  if (section === undefined) throw new Error(`JSON_PROJECTION_SECTION_MISSING ${slotId}`);
  return section;
}

const ALLOWLISTED_FACTS = new Set([
  "promptLanguage", "lowerGarmentCategoryId", "skirtLengthId", "lens", "lensV5Id",
  "photoLook", "photoLookV5Id", "expression", "expressionV5Id",
]);

function allowlistedFact(state: ResolvedState, key: string): unknown {
  if (!ALLOWLISTED_FACTS.has(key)) throw new Error(`JSON_PROJECTION_FACT_NOT_ALLOWLISTED ${key}`);
  return state.facts.values[key];
}

function readPath(value: unknown, path: string): unknown {
  let current = value;
  for (const segment of path.split(".")) {
    if (current === null || Array.isArray(current) || typeof current !== "object") return undefined;
    current = (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current;
}

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[key];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? child as Readonly<Record<string, unknown>>
    : undefined;
}

function objectAtRequired(value: unknown, key: string): Readonly<Record<string, unknown>> {
  const object = objectAt(value, key);
  if (object === undefined) throw new Error(`JSON_PROJECTION_VALUE_MISSING ${key}`);
  return object;
}

function requiredString(value: Readonly<Record<string, unknown>>, key: string, path: string): string {
  const candidate = value[key];
  if (typeof candidate !== "string") throw new Error(`JSON_PROJECTION_VALUE_MISSING ${path}`);
  return candidate;
}

function requiredNumber(value: Readonly<Record<string, unknown>> | undefined, key: string, path: string): number {
  const candidate = value?.[key];
  if (typeof candidate !== "number") throw new Error(`JSON_PROJECTION_VALUE_MISSING ${path}`);
  return candidate;
}

function deepFreezeProjection<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreezeProjection(child);
    Object.freeze(value);
  }
  return value;
}
