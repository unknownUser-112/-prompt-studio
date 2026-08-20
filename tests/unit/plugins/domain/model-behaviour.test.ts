import { describe, expect, it } from "vitest";

import { modelBehaviourProvider } from "../../../../src/plugins/model-behaviour/rules";
import { modelBehaviourSection } from "../../../../src/plugins/model-behaviour/sections";
import { cameraProvider } from "../../../../src/plugins/camera/rules";
import { brandProvider } from "../../../../src/plugins/brand/rules";
import { characterSheetProvider } from "../../../../src/plugins/character-sheet/rules";
import type { ConstraintProvider } from "../../../../src/domain/contracts/constraints/provider";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createCanonicalProjectStateV5Values } from "../../../../src/domain/entities/project-factory";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";

const resolve = (input: unknown, providers: readonly ConstraintProvider[] = [modelBehaviourProvider]) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, providers);

describe("model-behaviour plugin", () => {
  const executionContract = [
    "Generate exactly one single image now.",
    "Return only the generated image; do not answer with explanatory text.",
    "Do not analyze, summarize, evaluate, or describe the requested image.",
    "Do not mention previous attempts and do not announce a later generation attempt.",
    "All following sections describe the same single photograph.",
    "The final canvas must contain exactly one continuous photographic frame with one camera distance and one framing. Never satisfy detail requests by adding a second crop or alternate view.",
    "Do not create a collage, diptych, triptych, split image, contact sheet, grid, comparison, multiple panels, multiple crops, multiple zoom levels, alternate compositions, multiple viewpoints, or repeated versions of the subject.",
  ].join("\n");
  const singlePhotographExecutionContract = [
    "Generate exactly one single photograph now.",
    "Output one continuous photographic frame only: no collage, no split screen, no diptych, no alternate take, no repeated subject, and no second panel.",
    "Return only the generated image.",
  ].join("\n");
  const negativePrompt = "anatomy errors, duplicate limbs, distorted proportions, plastic skin, over-smoothed skin, deformed hands, extra fingers, text, watermark, logo, caption, signature, identity drift";
  const authorizedNegativePrompt = "anatomy errors, duplicate limbs, distorted proportions, plastic skin, over-smoothed skin, deformed hands, extra fingers, watermark, caption, signature, identity drift, unrelated text, additional logos, branding on unrequested garments, watermark";

  it("records the selected model behaviour without inventing a default", async () => {
    const state = await resolve({ model: { behaviour: "strict-json" } });

    expect(state.values).toEqual({ model: { behaviour: "strict-json" } });
    expect(state.trace.entries[0]).toMatchObject({ ruleId: "model-behaviour.selection" });
  });

  it.each(["Deutsch", "English"])("exposes profile-agnostic style and restriction fragments in %s", async (promptLanguage) => {
    const state = await resolve({ promptLanguage, model: { behaviour: "style.authentic_lifestyle" } });
    const first = modelBehaviourSection.provide(state)[0]!;
    const second = modelBehaviourSection.provide(state)[0]!;

    expect(first).toEqual(second);
    expect(first.fragments?.map(({ id }) => id)).toEqual(promptLanguage === "Deutsch"
      ? [
        "style.general",
        "style.capture-character",
        "realism.body-mechanics",
        "realism.hair-details",
        "realism.natural-irregularity",
        "realism.spatial-material-light",
        "realism.photographic-character",
        "restrictions.capture-quality",
        "restrictions.capture-quality-detailed",
        "restrictions.preservation-contract",
        "realism.compact-photographic",
        "restrictions.branding",
        "restrictions.compact-final",
        "restrictions.negative-prompt",
      ]
      : ["style.general", "realism.natural-irregularity", "realism.spatial-material-light", "realism.photographic-character", "restrictions.capture-quality", "restrictions.capture-quality-detailed", "restrictions.preservation-contract", "realism.compact-photographic", "restrictions.branding", "restrictions.compact-final", "restrictions.negative-prompt"]);
    expect(first.fragments?.every(({ traceIds }) => traceIds.length === 1)).toBe(true);
    expect(first.fragments?.every(({ text }) => text.length > 0)).toBe(true);
    expect(first.fragments?.every(({ id }) => !id.includes("gemini"))).toBe(true);
  });

  it.each([
    ["Deutsch", "Natürliche Unregelmäßigkeit hat Vorrang vor makelloser visueller Perfektion."],
    ["English", "Natural irregularity takes priority over flawless visual perfection."],
  ])("exposes exact resolved natural irregularity in %s", async (promptLanguage, expectedText) => {
    const state = await resolve({ promptLanguage, model: { behaviour: "style.authentic_lifestyle" } });
    const first = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.natural-irregularity");
    const second = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.natural-irregularity");

    expect(first).toEqual(second);
    expect(first?.text).toBe(expectedText);
    expect(first?.text.trim()).not.toBe("");
    expect(first?.text).not.toContain("NATURAL HUMAN DETAIL");
    expect(first?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
  });

  it.each([
    [
      "Deutsch",
      "Die Aufnahme zeigt glaubwürdige Anatomie, realistische Raumgeometrie und konsistente Material- und Lichtphysik.",
      "Glaubwürdige Anatomie sowie konsistente Raum-, Material- und Lichtphysik.",
    ],
    [
      "English",
      "The photograph must show believable anatomy, realistic spatial geometry, and consistent material and lighting physics.",
      "Credible anatomy and consistent spatial, material, and lighting physics.",
    ],
  ])("adds exact photographic character without changing spatial-material-light in %s", async (promptLanguage, expectedText, existingText) => {
    const state = await resolve({ promptLanguage, model: { behaviour: "style.authentic_lifestyle" } });
    const first = modelBehaviourSection.provide(state)[0]!;
    const second = modelBehaviourSection.provide(state)[0]!;
    const photographicCharacter = first.fragments?.find(({ id }) => id === "realism.photographic-character");
    const spatialMaterialLight = first.fragments?.find(({ id }) => id === "realism.spatial-material-light");

    expect(first).toEqual(second);
    expect(photographicCharacter?.text).toBe(expectedText);
    expect(photographicCharacter?.text.trim()).not.toBe("");
    expect(photographicCharacter?.text).not.toContain("PHOTOGRAPHIC CHARACTER");
    expect(photographicCharacter?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
    expect(spatialMaterialLight).toEqual({
      id: "realism.spatial-material-light",
      text: existingText,
      traceIds: ["model.behaviour:model-behaviour.selection"],
    });
  });

  it.each([
    [
      "Deutsch",
      "Keine künstliche Hautglättung, keine übertriebene Hintergrundunschärfe, kein starkes Cinematic Color Grading und kein Wasserzeichen.",
      "Keine künstliche Hautglättung, keine übertriebene Unschärfe, kein starkes Cinematic Color Grading und kein Wasserzeichen.",
    ],
    [
      "English",
      "No artificial skin smoothing, no excessive background blur, no heavy cinematic color grading, and no watermark.",
      "No artificial skin smoothing, excessive blur, heavy cinematic grading, or watermark.",
    ],
  ])("adds detailed capture-quality restrictions without changing the existing fragment in %s", async (promptLanguage, expectedText, existingText) => {
    const state = await resolve({ promptLanguage, model: { behaviour: "style.authentic_lifestyle" } });
    const first = modelBehaviourSection.provide(state)[0]!;
    const second = modelBehaviourSection.provide(state)[0]!;
    const detailed = first.fragments?.find(({ id }) => id === "restrictions.capture-quality-detailed");
    const existing = first.fragments?.find(({ id }) => id === "restrictions.capture-quality");

    expect(first).toEqual(second);
    expect(detailed?.text).toBe(expectedText);
    expect(detailed?.text.trim()).not.toBe("");
    expect(detailed?.text).not.toContain("RESTRICTIONS");
    expect(detailed?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
    expect(existing).toEqual({
      id: "restrictions.capture-quality",
      text: existingText,
      traceIds: ["model.behaviour:model-behaviour.selection"],
    });
  });

  it("adds 85-mm compression to body mechanics from the resolved camera lens", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "Deutsch",
      lens: "85-mm-Porträtobjektiv",
    }, [cameraProvider, modelBehaviourProvider]);
    const fragment = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.body-mechanics");

    expect(fragment?.text).toContain("leichte Telekompression mit natürlicher Gesichtsperspektive und ruhigem Hintergrund.");
    expect(fragment?.traceIds).toEqual([
      "camera.lens:camera.lens",
      "model.behaviour:model-behaviour.selection",
    ]);
  });

  it("keeps baseline body mechanics free of telecompression for the smartphone lens", async () => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage: "Deutsch" }, [cameraProvider, modelBehaviourProvider]);
    const fragment = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.body-mechanics");

    expect(fragment?.text).not.toContain("Telekompression");
    expect(fragment?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
  });

  it("uses the resolved warm photo look for capture character", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "Deutsch",
      photoLook: "Klar, aber natürlich",
    }, [cameraProvider, modelBehaviourProvider]);
    const fragment = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "style.capture-character");

    expect(fragment?.text).toBe("ausgewogene, zurückhaltende Smartphone-HDR-Verarbeitung. klare, aber nicht überschärfte rechnerische Detailzeichnung. sehr dezentes Sensorrauschen. leicht weichere Details an den Bildrändern.");
    expect(fragment?.traceIds).toEqual([
      "camera.photoLook:camera.photo-look",
      "model.behaviour:model-behaviour.selection",
    ]);
  });

  it("keeps natural photo-look capture character byte-identical", async () => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage: "Deutsch" }, [cameraProvider, modelBehaviourProvider]);
    const fragment = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "style.capture-character");

    expect(fragment?.text).toBe("zurückhaltendes Smartphone-HDR. leichte rechnerische Schärfung. sehr dezentes Sensorrauschen. leicht weichere Details an den Bildrändern.");
    expect(fragment?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
  });

  it.each([
    [
      "Deutsch",
      { tshirtBrand: "Tommy Hilfiger", brandVisibility: "Dezent sichtbar", brandPlacement: "Brustbereich / Vorderseite" },
      "Das authentische Branding einschließlich des Markenlogos ist bewusst sichtbar und ausschließlich wie folgt erlaubt: Tommy Hilfiger: ausschließlich auf Oberteil.\nDas Logo soll klein und dezent bleiben. Bevorzugte Platzierung: Brustbereich / Vorderseite.\nDas Logo muss der natürlichen Konstruktion des Kleidungsstücks folgen und darf nur dort erscheinen, wo ein reales Produkt Herstellerbranding tragen würde. Markenschrift ist nur als Bestandteil dieses ausdrücklich gewünschten Brandings erlaubt. Kein fremder Text, keine zusätzlichen oder duplizierten Logos und kein Branding auf anderen Kleidungsstücken, Accessoires, Gegenständen oder in der Umgebung.",
      ["brand.allowedGarment:brand.garment-binding", "brand.name:brand.name", "brand.placement:brand.placement", "brand.visibility:brand.visibility"],
    ],
    [
      "English",
      { shoesBrand: "Nike", shoesModel: "Air Force 1", brandVisibility: "Deutlich sichtbar", brandPlacement: "Schuhseite / Zunge" },
      "Authentic branding, including the brand logo, is intentionally visible and permitted only as follows: Nike: classic white sneakers only.\nMake the logo clearly recognizable while naturally integrated into the material. Preferred placement: shoe side or tongue.\nThe logo must follow the natural construction of the garment and may appear only where a real product would contain manufacturer branding. Brand lettering is permitted only as part of this explicitly requested branding. No unrelated text, additional or duplicated logos, or branding on other garments, accessories, objects, or the environment.",
      ["brand.allowedGarment:brand.garment-binding", "brand.model:brand.model", "brand.name:brand.name", "brand.placement:brand.placement", "brand.visibility:brand.visibility"],
    ],
  ])("formulates resolved authorized-branding restrictions with exact cross-provider traces in %s", async (promptLanguage, branding, expectedText, expectedTraceIds) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      ...branding,
      promptLanguage,
    }, [brandProvider, modelBehaviourProvider]);
    const fragments = modelBehaviourSection.provide(state)[0]?.fragments ?? [];
    const fragment = fragments.find(({ id }) => id === "restrictions.branding-authorized");

    expect(fragment?.text).toBe(expectedText);
    expect(fragment?.traceIds).toEqual(expectedTraceIds);
    expect(fragments.some(({ id }) => id === "restrictions.branding")).toBe(false);
  });

  it.each(["Deutsch", "English"])("materializes only the default branding restriction without resolved authorized branding in %s", async (promptLanguage) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
    }, [brandProvider, modelBehaviourProvider]);
    const fragments = modelBehaviourSection.provide(state)[0]?.fragments ?? [];
    const brandingFragments = fragments.filter(({ id }) => id.startsWith("restrictions.branding"));

    expect(brandingFragments).toHaveLength(1);
    expect(brandingFragments[0]?.id).toBe("restrictions.branding");
    expect(brandingFragments[0]?.text).toBe(promptLanguage === "Deutsch"
      ? "Kein sichtbarer Text, keine Logos und kein sonstiges Branding."
      : "No visible text, logos, or other branding.");
    expect(brandingFragments[0]?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
  });

  it("resolves the enabled execution instruction canonically with exact source provenance", async () => {
    const state = await resolve({ executionInstruction: true }, [modelBehaviourProvider]);

    expect(state.values).toEqual({ model: { execution: "execution.generate_single_image" } });
    expect(state.trace.entries).toEqual([
      expect.objectContaining({
        id: "model.execution:model-behaviour.execution",
        path: "model.execution",
        ruleId: "model-behaviour.execution",
        sourceField: "executionInstruction",
      }),
    ]);
  });

  it("resolves an explicitly disabled execution instruction without materializing an execution fragment", async () => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), executionInstruction: false }, [modelBehaviourProvider]);
    const fragments = modelBehaviourSection.provide(state)[0]?.fragments ?? [];

    expect(state.values).toHaveProperty("model.execution", "execution.disabled");
    expect(fragments.some(({ id }) => id === "execution.image-generation" || id === "execution.single-photograph")).toBe(false);
  });

  it.each(["Deutsch", "English"])("materializes the complete locale-invariant execution contract with exact trace in %s", async (promptLanguage) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), executionInstruction: true, promptLanguage }, [modelBehaviourProvider]);
    const first = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "execution.image-generation");
    const second = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "execution.image-generation");
    const singlePhotograph = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "execution.single-photograph");

    expect(first?.text).toBe(executionContract);
    expect(first?.traceIds).toEqual(["model.execution:model-behaviour.execution"]);
    expect(second).toEqual(first);
    expect(singlePhotograph?.text).toBe(singlePhotographExecutionContract);
    expect(singlePhotograph?.traceIds).toEqual(["model.execution:model-behaviour.execution"]);
  });

  it.each([
    [
      "Deutsch",
      "Glaubwürdige Anatomie, natürliche Proportionen, realistischer Stofffall, natürliche Haut- und Haarstruktur sowie konsistente Schatten. Keine CGI-Perfektion, keine künstliche Hautglättung und keine übertriebene Schärfung.",
    ],
    [
      "English",
      "Believable anatomy, exact selected body proportions, realistic garment drape, natural skin and hair texture, and one consistent light source. No CGI-like perfection, artificial skin smoothing, or excessive sharpening.",
    ],
  ])("materializes compact photographic realism deterministically in %s", async (promptLanguage, expected) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage }, [modelBehaviourProvider]);
    const first = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.compact-photographic");
    const second = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.compact-photographic");

    expect(first?.text).toBe(expected);
    expect(first?.traceIds).toEqual(["model.behaviour:model-behaviour.selection"]);
    expect(second).toEqual(first);
  });

  it("materializes compact human detail with exact cross-provider provenance", async () => {
    const state = await resolve(
      { ...createCanonicalProjectStateV5Values(), promptLanguage: "Deutsch" },
      [characterSheetProvider, modelBehaviourProvider],
    );
    const first = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.compact-human-detail");
    const second = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "realism.compact-human-detail");

    expect(first).toEqual({
      id: "realism.compact-human-detail",
      text: "natürlicher Haut-Look mit glaubwürdiger Struktur, sichtbare Poren mit natürlich variierender Dichte, natürliche Gruppierung einzelner Strähnen, Die Strähnen wirken natürlich organisiert und bleiben leicht asymmetrisch verteilt, einige natürlich verteilte einzelne abstehende Haare mit zufälliger, nicht gleichförmiger Verteilung",
      traceIds: [
        "character.skinTone:character-sheet.skinTone",
        "model.behaviour:model-behaviour.selection",
      ],
    });
    expect(second).toEqual(first);
  });

  it("materializes only the default negative prompt with exact provenance", async () => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage: "English" }, [brandProvider, modelBehaviourProvider]);
    const fragments = modelBehaviourSection.provide(state)[0]?.fragments ?? [];
    const first = fragments.find(({ id }) => id === "restrictions.negative-prompt");

    expect(first).toEqual({
      id: "restrictions.negative-prompt",
      text: negativePrompt,
      traceIds: ["model.behaviour:model-behaviour.selection"],
    });
    expect(fragments.map(({ id }) => id)).not.toContain("restrictions.negative-prompt-authorized");
    expect(modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "restrictions.negative-prompt")).toEqual(first);
  });

  it("materializes only the authorized-branding negative prompt with exact provenance", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "English",
      tshirtBrand: "Tommy Hilfiger",
      brandVisibility: "Dezent sichtbar",
      brandPlacement: "Brustbereich / Vorderseite",
    }, [brandProvider, modelBehaviourProvider]);
    const fragments = modelBehaviourSection.provide(state)[0]?.fragments ?? [];
    const first = fragments.find(({ id }) => id === "restrictions.negative-prompt-authorized");

    expect(first).toEqual({
      id: "restrictions.negative-prompt-authorized",
      text: authorizedNegativePrompt,
      traceIds: [
        "brand.allowedGarment:brand.garment-binding",
        "brand.name:brand.name",
        "model.behaviour:model-behaviour.selection",
      ],
    });
    expect(fragments.map(({ id }) => id)).not.toContain("restrictions.negative-prompt");
    expect(modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "restrictions.negative-prompt-authorized")).toEqual(first);
  });

  it.each([
    [
      "Deutsch",
      "Bewahre Identität, sichtbare Anatomie, Pose, Outfit und Raumgeometrie. Füge keine nicht spezifizierten Personen, Kleidungsstücke, Accessoires, Texte, Logos oder Wasserzeichen hinzu.",
    ],
    [
      "English",
      "Preserve identity, visible anatomy, pose, outfit, and spatial geometry. Do not add unspecified garments, accessories, text, logos, or watermarks.",
    ],
  ])("materializes the resolved preservation contract deterministically in %s", async (promptLanguage, expected) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage }, [modelBehaviourProvider]);
    const first = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "restrictions.preservation-contract");
    const second = modelBehaviourSection.provide(state)[0]?.fragments?.find(({ id }) => id === "restrictions.preservation-contract");

    expect(first).toEqual({
      id: "restrictions.preservation-contract",
      text: expected,
      traceIds: ["model.behaviour:model-behaviour.selection"],
    });
    expect(second).toEqual(first);
  });

  it.each([
    ["Deutsch", "Keine sichtbaren Texte, Logos oder Wasserzeichen."],
    ["English", "No visible text, logos, or watermark."],
  ])("materializes only the compact default final restriction in %s", async (promptLanguage, expected) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage }, [brandProvider, modelBehaviourProvider]);
    const fragments = modelBehaviourSection.provide(state)[0]?.fragments ?? [];
    const compact = fragments.filter(({ id }) => id.startsWith("restrictions.compact-final"));

    expect(compact).toEqual([{
      id: "restrictions.compact-final",
      text: expected,
      traceIds: ["model.behaviour:model-behaviour.selection"],
    }]);
  });

  it.each([
    [
      "Deutsch",
      { tshirtBrand: "Tommy Hilfiger", brandVisibility: "Dezent sichtbar", brandPlacement: "Brustbereich / Vorderseite" },
      "Nur die ausdrücklich ausgewählte authentische Markenkennzeichnung ist erlaubt (Tommy Hilfiger: Oberteil); keine weiteren Texte oder Logos.",
      ["brand.allowedGarment:brand.garment-binding", "brand.name:brand.name"],
    ],
    [
      "English",
      { shoesBrand: "Nike", shoesModel: "Air Force 1", brandVisibility: "Deutlich sichtbar", brandPlacement: "Schuhseite / Zunge" },
      "Only the explicitly selected authentic branding is permitted (Nike: shoes); no other text or logos.",
      ["brand.allowedGarment:brand.garment-binding", "brand.name:brand.name"],
    ],
  ])("materializes only the compact authorized final restriction in %s", async (promptLanguage, branding, expected, traceIds) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), ...branding, promptLanguage }, [brandProvider, modelBehaviourProvider]);
    const fragments = modelBehaviourSection.provide(state)[0]?.fragments ?? [];
    const compact = fragments.filter(({ id }) => id.startsWith("restrictions.compact-final"));

    expect(compact).toEqual([{
      id: "restrictions.compact-final-authorized",
      text: expected,
      traceIds,
    }]);
  });
});
