import { describe, expect, it } from "vitest";

import { characterSheetProvider } from "../../../../src/plugins/character-sheet/rules";
import { cameraProvider } from "../../../../src/plugins/camera/rules";
import { garmentProvider } from "../../../../src/plugins/garment/rules";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";
import { createCanonicalProjectStateV5Values } from "../../../../src/domain/entities/project-factory";
import { characterSheetSection } from "../../../../src/plugins/character-sheet/sections";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [characterSheetProvider]);
const resolveWithGarment = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [characterSheetProvider, garmentProvider]);
const resolveWithOrder = (input: unknown, reversed = false) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
  input,
  reversed ? [cameraProvider, characterSheetProvider] : [characterSheetProvider, cameraProvider],
);

const PRIMARY_SUBJECT_CONTRACT_DE = "Erwachsene Frau, 21 Jahre alt und 160 cm groß; Schlank & ausgewogen, Durchschnittlich Brustvolumen, Natürlich ausgewogen Brustform, ausgewogenen Hüftproportionen. heller, warmer Hautton, graublaue Augen; brustlange blonde natürlich wellige Haare. Die ausgewählten Körperproportionen exakt beibehalten; Anatomie, Schwerkraft und Stoffspannung bleiben glaubwürdig.";
const PRIMARY_SUBJECT_CONTRACT_EN = "Adult woman, 21 years old and 160 cm tall; slim and balanced figure, average chest volume, naturally balanced chest shape, and balanced hip proportions. fair skin with warm undertones, gray-blue eyes, and chest-length blonde naturally wavy hair. Preserve the exact selected body proportions; anatomy, gravity, and garment tension remain believable.";
const PRIMARY_SUBJECT_TRACE_IDS = [
  "character.adult:character-sheet.adult-status",
  "character.age:character-sheet.adult-status",
  "character.bodyBuild:character-sheet.bodyBuild",
  "character.chestShape:character-sheet.chestShape",
  "character.chestVolume:character-sheet.chestVolume",
  "character.eyeColor:character-sheet.eyeColor",
  "character.gender:character-sheet.gender",
  "character.hair.color:character-sheet.hair.color",
  "character.hair.length:character-sheet.hair.length",
  "character.hair.texture:character-sheet.hair.texture",
  "character.heightCentimeters:character-sheet.heightCentimeters",
  "character.lowerBody:character-sheet.lowerBody",
  "character.skinTone:character-sheet.skinTone",
] as const;

describe("character-sheet plugin", () => {
  it("records an adult character-sheet identity from the supplied facts", async () => {
    const state = await resolve({ character: { age: 29, name: "Ada" } });

    expect(state.values).toEqual({ character: { age: 29, name: "Ada", adult: true } });
    expect(new Set(state.trace.entries.map((entry) => entry.ruleId))).toEqual(new Set(["character-sheet.identity", "character-sheet.adult-status"]));
  });

  it("projects position, gaze, and expression with stable trace metadata", async () => {
    const input = {
      pose: {
        position: "pose.standing",
        gaze: "gaze.left_camera",
        expression: "expression.relaxed",
      },
    };

    const state = await resolve(input);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      poseTrace("expression"),
      poseTrace("gaze"),
      poseTrace("position"),
    ]);
  });

  it("does not invent missing pose facts and remains independent of provider order", async () => {
    const input = { pose: { position: "pose.standing" } };

    const normal = await resolveWithOrder(input);
    const reversed = await resolveWithOrder(input, true);

    expect(normal.values).toEqual(input);
    expect(reversed).toEqual(normal);
  });

  it("projects expression with V5 id, flat label, then nested priority", async () => {
    const v5 = await resolve({
      expressionV5Id: "expression.laughing",
      expression: "natürlich lachend",
      pose: { expression: "expression.relaxed" },
    });
    const flat = await resolve({ expression: "natürlich lachend", pose: { expression: "expression.relaxed" } });
    const nested = await resolve({ pose: { expression: "expression.relaxed" } });

    expect(v5.values).toEqual({ pose: { expression: "expression.laughing" } });
    expect(v5.trace.entries).toContainEqual(expect.objectContaining({
      id: "pose.expression:character-sheet.pose-expression",
      ruleId: "character-sheet.pose-expression",
      sourceField: "expressionV5Id",
    }));
    expect(v5.trace.entries.filter(({ path }) => path === "pose.expression")).toHaveLength(1);
    expect(flat.values).toEqual({ pose: { expression: "expression.laughing" } });
    expect(flat.trace.entries).toContainEqual(expect.objectContaining({ sourceField: "expression" }));
    expect(nested.values).toEqual({ pose: { expression: "expression.relaxed" } });
    expect(nested.trace.entries).toContainEqual(expect.objectContaining({ sourceField: "pose.expression" }));
    expect(await resolveWithOrder({ expressionV5Id: "expression.laughing", pose: { expression: "expression.relaxed" } }, true))
      .toEqual(await resolveWithOrder({ expressionV5Id: "expression.laughing", pose: { expression: "expression.relaxed" } }));
  });

  it("normalizes the adult-only flat expression to the existing canonical value and preserves its source trace", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "English",
      age: "18",
      expression: "mit neutralem, ruhigem Ausdruck",
    });

    expect(state.values).toHaveProperty("pose.expression", "expression.relaxed");
    expect(state.trace.entries.find(({ path }) => path === "pose.expression")).toMatchObject({
      id: "pose.expression:character-sheet.pose-expression",
      ruleId: "character-sheet.pose-expression",
      sourceField: "expression",
    });
    expect(characterSheetSection.provide(state)
      .flatMap((draft) => draft.fragments ?? [])
      .find(({ id }) => id === "pose.action")?.text)
      .toBe("Standing upright with weight resting naturally on one leg. She looks slightly past the camera and has a relaxed expression.");
  });

  it.each([
    ["English", "expression.relaxed", "Standing upright with weight resting naturally on one leg. She looks slightly past the camera and has a relaxed expression."],
    ["English", "expression.laughing", "Standing upright with weight resting naturally on one leg. She looks slightly past the camera and is laughing naturally."],
    ["Deutsch", "expression.laughing", "frontal und aufrecht stehend, Gewicht locker auf einem Bein. Sie blickt leicht links an der Kamera vorbei und lacht natürlich."],
  ])("formulates pose.action from resolved expression in %s for %s", async (promptLanguage, expressionV5Id, expected) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
      expressionV5Id,
      expression: "a conflicting raw expression label",
    });
    const fragments = characterSheetSection.provide(state).flatMap((draft) => draft.fragments ?? []);
    const fragment = fragments.find(({ id }) => id === "pose.action");

    expect(fragment?.text).toBe(expected);
    expect(fragment?.traceIds).toEqual([
      "pose.expression:character-sheet.pose-expression",
      "pose.gaze:character-sheet.pose-gaze",
      "pose.position:character-sheet.pose-position",
    ]);
  });

  it("projects all persisted face facts with stable trace metadata", async () => {
    const input = {
      character: {
        faceShape: "faceShape.oval",
        eyeShape: "eyeShape.almond",
        noseShape: "noseShape.straight",
        faceAge: "faceAge.adult",
      },
    };

    const state = await resolve(input);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      characterTrace("eyeShape"),
      characterTrace("faceAge"),
      characterTrace("faceShape"),
      characterTrace("noseShape"),
    ]);
  });

  it("does not invent absent face facts and resolves them independently of provider order", async () => {
    const input = { character: { faceShape: "faceShape.user" } };

    const normal = await resolveWithOrder(input);
    const reversed = await resolveWithOrder(input, true);

    expect(normal.values).toEqual(input);
    expect(reversed).toEqual(normal);
  });

  it("projects flat character facts onto canonical paths with exact source traces", async () => {
    const input = {
      age: "21",
      height: "160 cm",
      bodyBuild: "Schlank & ausgewogen",
      chestProfile: "Sehr voll",
      chestShape: "Natürlich ausgewogen",
      lowerBody: "weich gerundete Hüftsilhouette",
    };

    const state = await resolve(input);

    expect(state.values).toEqual({
      character: {
        adult: true,
        age: 21,
        heightCentimeters: 160,
        bodyBuild: "bodyBuild.slim_balanced",
        chestVolume: "chestVolume.very_full",
        chestShape: "chestShape.natural_balanced",
        lowerBody: "lowerBody.softly_rounded",
      },
    });
    expect(state.trace.entries.map(({ id, path, sourceField }) => ({ id, path, sourceField }))).toEqual([
      { id: "character.adult:character-sheet.adult-status", path: "character.adult", sourceField: "age" },
      { id: "character.age:character-sheet.adult-status", path: "character.age", sourceField: "age" },
      { id: "character.bodyBuild:character-sheet.bodyBuild", path: "character.bodyBuild", sourceField: "bodyBuild" },
      { id: "character.chestShape:character-sheet.chestShape", path: "character.chestShape", sourceField: "chestShape" },
      { id: "character.chestVolume:character-sheet.chestVolume", path: "character.chestVolume", sourceField: "chestProfile" },
      { id: "character.heightCentimeters:character-sheet.heightCentimeters", path: "character.heightCentimeters", sourceField: "height" },
      { id: "character.lowerBody:character-sheet.lowerBody", path: "character.lowerBody", sourceField: "lowerBody" },
    ]);
  });

  it("applies flat character priority field-by-field and preserves untouched nested values", async () => {
    const input = {
      character: {
        age: 42,
        heightCentimeters: 172,
        bodyBuild: "bodyBuild.nested",
        chestVolume: "chestVolume.average",
        chestShape: "chestShape.nested",
        lowerBody: "lowerBody.balanced",
      },
      chestProfile: "Sehr voll",
      lowerBody: "weich gerundete Hüftsilhouette",
    };

    const normal = await resolveWithOrder(input);
    const reversed = await resolveWithOrder(input, true);

    expect(normal.values).toMatchObject({ character: {
      age: 42,
      heightCentimeters: 172,
      bodyBuild: "bodyBuild.nested",
      chestVolume: "chestVolume.very_full",
      chestShape: "chestShape.nested",
      lowerBody: "lowerBody.softly_rounded",
    } });
    expect(normal.trace.entries.find(({ path }) => path === "character.chestVolume")?.sourceField).toBe("chestProfile");
    expect(normal.trace.entries.find(({ path }) => path === "character.lowerBody")?.sourceField).toBe("lowerBody");
    expect(reversed).toEqual(normal);
  });

  it("formats the subject fragment only from canonical resolved character values", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "English",
      chestProfile: "Sehr voll",
      lowerBody: "weich gerundete Hüftsilhouette",
    });
    const fragment = characterSheetSection.provide(state)
      .flatMap((draft) => draft.fragments ?? [])
      .find(({ id }) => id === "character.subject");

    expect(fragment?.text).toContain("a very full chest volume");
    expect(fragment?.text).toContain("a softly rounded hip silhouette");
    expect(fragment?.traceIds).toContain("character.chestVolume:character-sheet.chestVolume");
    expect(fragment?.traceIds).toContain("character.lowerBody:character-sheet.lowerBody");
  });

  it.each([
    ["Deutsch", PRIMARY_SUBJECT_CONTRACT_DE],
    ["English", PRIMARY_SUBJECT_CONTRACT_EN],
  ])("materializes the exact traced primary-subject contract in %s", async (promptLanguage, expected) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = characterSheetSection.provide(state);
    const second = characterSheetSection.provide(state);
    const fragment = first.flatMap((draft) => draft.fragments ?? [])
      .find(({ id }) => id === "character.primary-subject-contract");

    expect(first).toEqual(second);
    expect(fragment?.text).toBe(expected);
    expect(fragment?.text.trim().length).toBeGreaterThan(0);
    expect(fragment?.text).not.toMatch(/^(VERBINDLICHE HAUPTPERSON|BINDING PRIMARY SUBJECT)\n/u);
    expect(fragment?.traceIds).toEqual(PRIMARY_SUBJECT_TRACE_IDS);
  });

  it("formats prioritized flat character values through the canonical primary-subject contract", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "English",
      chestProfile: "Sehr voll",
      lowerBody: "weich gerundete Hüftsilhouette",
    });
    const fragment = characterSheetSection.provide(state)
      .flatMap((draft) => draft.fragments ?? [])
      .find(({ id }) => id === "character.primary-subject-contract");

    expect(fragment?.text).toContain("very full chest volume");
    expect(fragment?.text).toContain("softly rounded hip silhouette");
    expect(fragment?.traceIds).toEqual(PRIMARY_SUBJECT_TRACE_IDS);
    expect(state.trace.entries.find(({ path }) => path === "character.chestVolume")?.sourceField).toBe("chestProfile");
    expect(state.trace.entries.find(({ path }) => path === "character.lowerBody")?.sourceField).toBe("lowerBody");
  });

  it.each([
    ["Deutsch", "offen getragene"],
    ["English", "loose"],
  ])("materializes the single traced character.hairstyle fragment in %s", async (promptLanguage, expected) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = characterSheetSection.provide(state);
    const second = characterSheetSection.provide(state);
    const fragment = first.flatMap((draft) => draft.fragments ?? [])
      .find(({ id }) => id === "character.hairstyle");

    expect(first).toEqual(second);
    expect(fragment?.text).toBe(expected);
    expect(fragment?.traceIds).toEqual(["character.hair.style:character-sheet.hair.style"]);
  });

  it.each([
    ["Deutsch", "Identität, Gesichtsmerkmale, Körperproportionen, Haarmerkmale und Outfit bleiben innerhalb des Bildes konsistent."],
    ["English", "Keep identity, facial features, body proportions, hair characteristics, and outfit internally consistent within the single image."],
  ])("exposes exact traced identity consistency without profile framing in %s", async (promptLanguage, expected) => {
    const state = await resolveWithGarment({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = characterSheetSection.provide(state);
    const second = characterSheetSection.provide(state);
    const fragment = first.flatMap((draft) => draft.fragments ?? []).find(({ id }) => id === "character.identity-consistency");

    expect(first).toEqual(second);
    expect(fragment?.text).toBe(expected);
    expect(fragment?.text.trim().length).toBeGreaterThan(0);
    expect(fragment?.text).not.toContain("SUBJECT IDENTITY");
    expect(fragment?.traceIds).toEqual([
      "character.adult:character-sheet.adult-status",
      "character.age:character-sheet.adult-status",
      "character.bodyBuild:character-sheet.bodyBuild",
      "character.chestShape:character-sheet.chestShape",
      "character.chestVolume:character-sheet.chestVolume",
      "character.eyeColor:character-sheet.eyeColor",
      "character.eyeShape:character-sheet.eyeShape",
      "character.faceAge:character-sheet.faceAge",
      "character.faceShape:character-sheet.faceShape",
      "character.gender:character-sheet.gender",
      "character.hair.color:character-sheet.hair.color",
      "character.hair.length:character-sheet.hair.length",
      "character.hair.style:character-sheet.hair.style",
      "character.hair.texture:character-sheet.hair.texture",
      "character.heightCentimeters:character-sheet.heightCentimeters",
      "character.lowerBody:character-sheet.lowerBody",
      "character.noseShape:character-sheet.noseShape",
      "character.skinTone:character-sheet.skinTone",
      "garment.footwear.color:garment.footwear-color",
      "garment.footwear.kind:garment.footwear-kind",
      "garment.lower.color:garment.lower-color",
      "garment.lower.kind:garment.lower-kind",
      "garment.upper.color:garment.upper-color",
      "garment.upper.kind:garment.upper-kind",
    ]);
  });

  it("projects the existing reference-mode facts with stable trace metadata", async () => {
    const input = {
      referenceMode: {
        enabled: true,
        mode: "referenceMode.character_sheet",
        sheetType: "referenceSheet.compact",
        layout: "referenceLayout.grid",
      },
    };

    const state = await resolve(input);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      referenceModeTrace("enabled"),
      referenceModeTrace("layout"),
      referenceModeTrace("mode"),
      referenceModeTrace("sheetType"),
    ]);
  });

  it("does not invent missing reference-mode facts and resolves them independently of provider order", async () => {
    const input = { referenceMode: { enabled: true } };

    const normal = await resolveWithOrder(input);
    const reversed = await resolveWithOrder(input, true);

    expect(normal.values).toEqual(input);
    expect(reversed).toEqual(normal);
  });

  it("exposes an exact traced reference-sheet fragment without profile framing", async () => {
    const input = {
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "English",
      referenceMode: {
        enabled: true,
        mode: "referenceMode.character_sheet",
        sheetType: "referenceSheet.compact",
        layout: "referenceLayout.grid",
      },
    };
    const state = await resolve(input);
    const first = characterSheetSection.provide(state);
    const second = characterSheetSection.provide(state);
    const fragment = first.flatMap((draft) => draft.fragments ?? []).find(({ id }) => id === "character.reference-sheet");

    expect(first).toEqual(second);
    expect(fragment?.text).toBe("Create exactly one unified character reference-sheet canvas containing exactly 4 selected views of the same clearly adult person: front view, back view, left profile, right profile.");
    expect(fragment?.text).not.toContain("CHARACTER REFERENCE SHEET");
    expect(fragment?.traceIds).toEqual([
      "referenceMode.enabled:character-sheet.reference-mode-enabled",
      "referenceMode.layout:character-sheet.reference-mode-layout",
      "referenceMode.mode:character-sheet.reference-mode-mode",
      "referenceMode.sheetType:character-sheet.reference-mode-sheet-type",
    ]);
    expect(fragment?.traceIds.every((id) => id.length > 0)).toBe(true);
  });

  it("does not materialize a reference-sheet fragment from an incomplete reference mode", async () => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage: "English", referenceMode: { enabled: true } });

    expect(characterSheetSection.provide(state).flatMap((draft) => draft.fragments ?? []).map(({ id }) => id)).not.toContain("character.reference-sheet");
  });

  it("projects single-reference purpose and view with stable trace metadata", async () => {
    const input = {
      referenceMode: {
        purpose: "referencePurpose.identity",
        singleView: "referenceView.front",
      },
    };

    const state = await resolve(input);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      referenceModeTrace("purpose"),
      referenceModeTrace("singleView"),
    ]);
  });

  it.each([
    [
      "Deutsch",
      "Erzeuge genau eine Front als Identitätsreferenz; keine zusätzlichen Ansichten. authentische fotografische Referenzaufnahme mit natürlicher Optik, glaubwürdiger Sensorwiedergabe und realen Oberflächen. Identität, Gesichtsgeometrie, Körperproportionen, Größe, Frisur, Kleidung und Farbgebung bleiben in allen Ansichten identisch. Natürliche Mikrovariationen in Haut, Haaren und Materialien bleiben fotografisch glaubwürdig, ohne die Identität zu verändern. Authentische Fotografie statt CGI: keine 3D-Renderoptik, keine plastikartige oder mannequinartige Haut, keine synthetisch gleichförmigen Haare, keine geklonten Materialtexturen und keine identisch wiederholten Faltenmuster. Verwende automatisch gleichmäßiges Referenzlicht und neutraler, zum Referenzzweck passender Hintergrund.",
    ],
    [
      "English",
      "Create exactly one front view as a identity reference; no additional views. authentic photographic reference capture with natural optics, credible sensor response, and real-world surfaces. Identity, facial geometry, body proportions, height, hairstyle, clothing, and color design remain identical in every view. Preserve photographically credible natural microvariation in skin, hair, and materials without changing identity. Authentic photography rather than CGI: no 3D-rendered appearance, plastic or mannequin-like skin, synthetically uniform hair, cloned material textures, or identically repeated wrinkle patterns. Use automatically balanced reference lighting and a neutral background appropriate to the reference purpose.",
    ],
  ])("exposes the exact traced single-reference fragment in %s", async (promptLanguage, expected) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
      referenceMode: {
        enabled: true,
        mode: "referenceMode.single_reference",
        purpose: "referencePurpose.identity",
        singleView: "referenceView.front",
      },
    });
    const fragment = characterSheetSection.provide(state)
      .flatMap((draft) => draft.fragments ?? [])
      .find(({ id }) => id === "character.single-reference");

    expect(fragment?.text).toBe(expected);
    expect(fragment?.text).not.toMatch(/^(EINZELNES REFERENZFOTO|SINGLE REFERENCE CAPTURE)\n/u);
    expect(fragment?.traceIds).toEqual([
      "referenceMode.enabled:character-sheet.reference-mode-enabled",
      "referenceMode.mode:character-sheet.reference-mode-mode",
      "referenceMode.purpose:character-sheet.reference-mode-purpose",
      "referenceMode.singleView:character-sheet.reference-mode-single-view",
    ]);
  });

  it("does not materialize a single-reference fragment from incomplete facts", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "English",
      referenceMode: { enabled: true, mode: "referenceMode.single_reference", purpose: "referencePurpose.identity" },
    });

    expect(characterSheetSection.provide(state).flatMap((draft) => draft.fragments ?? []).map(({ id }) => id)).not.toContain("character.single-reference");
  });

  it.each(["Deutsch", "English"])("exposes deterministic semantic character fragments without universal headings in %s", async (promptLanguage) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = characterSheetSection.provide(state);
    const second = characterSheetSection.provide(state);
    const fragments = first.flatMap((draft) => draft.fragments ?? []);

    expect(first).toEqual(second);
    expect(fragments.map(({ id }) => id)).toEqual([
      "character.subject",
      "character.primary-subject-contract",
      "character.hairstyle",
      "realism.skin",
      "pose.action",
      "character.facial-features",
    ]);
    expect(fragments.every(({ text }) => !/^(PERSON|SUBJECT|HAUTREALISMUS|SKIN REALISM|POSE|GESICHTSMERKMALE|FACIAL FEATURES)\n/u.test(text))).toBe(true);
    expect(fragments.every(({ traceIds }) => traceIds.length > 0)).toBe(true);
    expect(new Set(fragments.flatMap(({ traceIds }) => traceIds))).toEqual(new Set(first.flatMap(({ traceIds }) => traceIds)));
  });
});

function poseTrace(field: string) {
  return {
    id: `pose.${field}:character-sheet.pose-${field}`,
    path: `pose.${field}`,
    ruleId: `character-sheet.pose-${field}`,
    sourceField: `pose.${field}`,
  };
}

function characterTrace(field: string) {
  return {
    id: `character.${field}:character-sheet.${field}`,
    path: `character.${field}`,
    ruleId: `character-sheet.${field}`,
    sourceField: `character.${field}`,
  };
}

function referenceModeTrace(field: string) {
  const ruleField = field === "sheetType" ? "sheet-type" : field === "singleView" ? "single-view" : field;
  return {
    id: `referenceMode.${field}:character-sheet.reference-mode-${ruleField}`,
    path: `referenceMode.${field}`,
    ruleId: `character-sheet.reference-mode-${ruleField}`,
    sourceField: `referenceMode.${field}`,
  };
}
