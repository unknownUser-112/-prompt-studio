import { describe, expect, it } from "vitest";

import { cameraProvider } from "../../../../src/plugins/camera/rules";
import { cameraSection } from "../../../../src/plugins/camera/sections";
import { selfieProvider } from "../../../../src/plugins/selfie/rules";
import { selfieSection } from "../../../../src/plugins/selfie/sections";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";
import { createCanonicalProjectStateV5Values } from "../../../../src/domain/entities/project-factory";

const resolve = (input: unknown, reversed = false) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
  input,
  reversed ? [selfieProvider, cameraProvider] : [cameraProvider, selfieProvider],
);

const UPPER_BODY_EN = "upper-body frame with a natural camera distance. Use one continuous portrait frame only, without a full-body alternative, comparison view, or repeated subject. Prioritize the face, eyes, skin, and hair detail; do not add full-body framing requirements. Captured with a modern smartphone camera system using a smartphone main camera with a natural perspective. The camera is at eye level. The shooting distance feels natural. Depth of field is subtle, and the shot feels calm and handheld. The framing should resemble a naturally captured smartphone photo rather than a carefully staged fashion campaign.";
const UPPER_BODY_DE = "Oberkörperaufnahme mit natürlichem Kameraabstand. Verwende nur einen einzigen durchgehenden Porträtrahmen, ohne Ganzkörperalternative, Vergleichsansicht oder wiederholte Person. Priorisiere Gesicht, Augen, Haut und Haardetails; füge keine Ganzkörperanforderungen hinzu. Aufgenommen mit einer modernes Smartphone-Kamerasystem und einem hauptkamera des Smartphones mit natürlicher Perspektive. natürlicher, authentischer fotografischer Charakter. natürliche Farbwiedergabe und ausgewogener Kontrast.";
const OUTPUT_CONTRACT_DE = "Genau ein durchgehendes Foto. Die Hauptperson erscheint genau einmal und vollständig von Kopf bis Fuß; beide Füße sind sichtbar und kein Körperteil wird angeschnitten.\nKeine Collage, kein geteiltes Bild, kein Vergleich, keine alternative Aufnahme und keine Wiederholung der Hauptperson.";
const OUTPUT_CONTRACT_EN = "Exactly one continuous photograph. The primary subject appears exactly once and is fully visible from head to toe; both feet are visible and no body part is cropped.\nNo collage, split image, comparison, alternate take, duplicate primary subject, or repeated view.";

describe("camera and selfie plugins", () => {
  it("projects flat framing facts with the canonical V5 id taking priority", async () => {
    const v5Only = await resolve({ framingV5Id: "framing.upper_body" });
    const labelOnly = await resolve({ framing: "Brust-aufwärts-Porträt mit natürlichem Abstand" });
    const both = await resolve({
      framingV5Id: "framing.upper_body",
      framing: "Brust-aufwärts-Porträt mit natürlichem Abstand",
      camera: { framing: "framing.whole_person" },
    });

    expect(v5Only.values).toEqual({ camera: { framing: "framing.upper_body" } });
    expect(v5Only.trace.entries).toContainEqual(expect.objectContaining({
      id: "camera.framing:camera.framing",
      ruleId: "camera.framing",
      sourceField: "framingV5Id",
    }));
    expect(labelOnly.values).toEqual({ camera: { framing: "Brust-aufwärts-Porträt mit natürlichem Abstand" } });
    expect(labelOnly.trace.entries).toContainEqual(expect.objectContaining({ sourceField: "framing" }));
    expect(both.values).toEqual({ camera: { framing: "framing.upper_body" } });
    expect(both.trace.entries.filter(({ path }) => path === "camera.framing")).toHaveLength(1);
    expect(both.trace.entries).toContainEqual(expect.objectContaining({ sourceField: "framingV5Id" }));
  });

  it("preserves nested framing when no flat fact exists and resolves deterministically", async () => {
    const input = { camera: { framing: "framing.whole_person" } };
    const first = await resolve(input);

    expect(first.values).toEqual(input);
    expect(first.trace.entries).toContainEqual(expect.objectContaining({
      id: "camera.framing:camera.framing",
      ruleId: "camera.framing",
      sourceField: "camera.framing",
    }));
    expect(await resolve(input)).toEqual(first);
    expect(await resolve(input, true)).toEqual(first);
  });

  it("projects the explicit 85-mm lens over the nested smartphone baseline", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      lens: "85-mm-Porträtobjektiv",
    });

    expect(state.values).toHaveProperty("camera.lens", "lens.portrait_85mm");
    expect(state.trace.entries.filter(({ path }) => path === "camera.lens")).toEqual([
      expect.objectContaining({
        id: "camera.lens:camera.lens",
        ruleId: "camera.lens",
        sourceField: "lens",
      }),
    ]);
  });

  it("projects the explicit warm photo look over the nested natural baseline", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      photoLook: "Klar, aber natürlich",
    });

    expect(state.values).toHaveProperty("camera.photoLook", "photoLook.warm");
    expect(state.trace.entries.filter(({ path }) => path === "camera.photoLook")).toEqual([
      expect.objectContaining({
        id: "camera.photoLook:camera.photo-look",
        ruleId: "camera.photo-look",
        sourceField: "photoLook",
      }),
    ]);
  });

  it("binds a selfie to a smartphone camera and arm-length framing", async () => {
    const input = { selfieMode: { enabled: true, type: "selfie.front", phoneVisibility: "selfiePhone.auto" } };
    const state = await resolve(input);

    expect(state.values).toEqual({
      camera: { device: "smartphone front camera", framing: "upper-body frame with a natural camera distance" },
      selfieMode: input.selfieMode,
    });
    expect(new Set(state.trace.entries.map((entry) => entry.ruleId))).toEqual(new Set([
      "selfie.enabled",
      "selfie.type",
      "selfie.phone-visibility",
      "selfie.camera-binding",
      "selfie.framing-binding",
    ]));
    expect(state.trace.entries.filter(({ ruleId }) => ruleId.endsWith("binding")).every((entry) => (
      "sourceFields" in entry
      && entry.sourceFields.join(",") === "selfieMode.enabled,selfieMode.type"
    ))).toBe(true);
    expect(await resolve(input, true)).toEqual(state);
  });

  it("projects an explicitly disabled selfie mode without inventing camera bindings", async () => {
    const input = { selfieMode: { enabled: false, type: "selfie.none", phoneVisibility: "selfiePhone.auto" } };

    const state = await resolve(input);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, ruleId, sourceField }) => ({ id, ruleId, sourceField }))).toEqual([
      { id: "selfieMode.enabled:selfie.enabled", ruleId: "selfie.enabled", sourceField: "selfieMode.enabled" },
      { id: "selfieMode.phoneVisibility:selfie.phone-visibility", ruleId: "selfie.phone-visibility", sourceField: "selfieMode.phoneVisibility" },
      { id: "selfieMode.type:selfie.type", ruleId: "selfie.type", sourceField: "selfieMode.type" },
    ]);
  });

  it("preserves the deterministic legacy camera.selfie binding when selfieMode is absent", async () => {
    const input = { camera: { selfie: true, device: "mirrorless" } };
    const first = await resolve(input);
    const second = await resolve(input);

    expect(first).toEqual(second);
    expect(first.values).toEqual({ camera: { device: "smartphone", selfie: true, framing: "arm-length selfie" } });
    expect(first.trace.entries.map(({ id, ruleId, sourceField }) => ({ id, ruleId, sourceField }))).toEqual([
      { id: "camera.device:selfie.camera-binding", ruleId: "selfie.camera-binding", sourceField: "camera.selfie" },
      { id: "camera.framing:selfie.framing-binding", ruleId: "selfie.framing-binding", sourceField: "camera.selfie" },
      { id: "camera.selfie:selfie.enabled", ruleId: "selfie.enabled", sourceField: "camera.selfie" },
    ]);
  });

  it.each([
    [true, false, true],
    [false, true, false],
  ])("gives selfieMode.enabled=%s priority over legacy camera.selfie=%s", async (enabled, legacy, expectsBinding) => {
    const state = await resolve({
      camera: { selfie: legacy },
      selfieMode: { enabled, type: enabled ? "selfie.front" : "selfie.none", phoneVisibility: "selfiePhone.auto" },
    });

    expect(state.values).toMatchObject({ selfieMode: { enabled } });
    expect(state.trace.entries.every((entry) => !("sourceField" in entry) || entry.sourceField !== "camera.selfie")).toBe(true);
    if (expectsBinding) {
      expect(state.values).toHaveProperty("camera.device", "smartphone front camera");
      expect(state.values).toHaveProperty("camera.framing", "upper-body frame with a natural camera distance");
    } else {
      expect(state.values).not.toHaveProperty("camera.device");
      expect(state.values).not.toHaveProperty("camera.framing");
    }
  });

  it("does not fill a partial selfieMode from the legacy camera.selfie contract", async () => {
    const state = await resolve({ camera: { selfie: true }, selfieMode: { enabled: true } });

    expect(state.values).toEqual({ selfieMode: { enabled: true } });
    expect(state.trace.entries).toHaveLength(1);
    expect(state.trace.entries[0]).toMatchObject({ path: "selfieMode.enabled", sourceField: "selfieMode.enabled" });
  });

  it.each(["Deutsch", "English"])("materializes deterministic traced selfie fragments without profile headings in %s", async (promptLanguage) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
      selfieMode: { enabled: true, type: "selfie.front", phoneVisibility: "selfiePhone.auto" },
    });
    const first = selfieSection.provide(state)[0]!;
    const second = selfieSection.provide(state)[0]!;
    const fragments = first.fragments ?? [];

    expect(first).toEqual(second);
    expect(first.text).toBe("Selfie binding");
    expect(fragments.map(({ id }) => id)).toEqual(["selfie.binding", "selfie.capture", "selfie.geometry"]);
    expect(fragments.every(({ text, traceIds }) => text.trim().length > 0 && traceIds.length > 0)).toBe(true);
    expect(fragments.every(({ text }) => !/^(BINDING SELFIE CAPTURE|SELFIE CAPTURE)\n/u.test(text))).toBe(true);
    expect(fragments.find(({ id }) => id === "selfie.capture")?.traceIds).toEqual([
      "camera.device:selfie.camera-binding",
      "camera.framing:selfie.framing-binding",
      "selfieMode.enabled:selfie.enabled",
      "selfieMode.phoneVisibility:selfie.phone-visibility",
      "selfieMode.type:selfie.type",
    ]);
  });

  it("does not materialize selfie fragments when the resolved mode is disabled", async () => {
    const state = await resolve({ selfieMode: { enabled: false, type: "selfie.none", phoneVisibility: "selfiePhone.auto" } });

    expect(selfieSection.provide(state)[0]?.fragments).toBeUndefined();
  });

  it.each([
    ["Deutsch", "KAMERA / PERSPEKTIVE\n", "Ganzkörper, Kopf bis Fuß"],
    ["English", "CAMERA / PERSPECTIVE\n", "full-body frame from head to toe"],
  ])("exposes a deterministic traced capture fragment without the universal heading in %s", async (promptLanguage, heading, contentStart) => {
    const input = { ...createCanonicalProjectStateV5Values(), promptLanguage };
    const state = await resolve(input);
    const first = cameraSection.provide(state)[0]!;
    const second = cameraSection.provide(state)[0]!;
    const fragment = first.fragments?.find(({ id }) => id === "camera.capture");

    expect(first).toEqual(second);
    expect(first.text.startsWith(heading)).toBe(true);
    expect(fragment?.text.startsWith(contentStart)).toBe(true);
    expect(fragment?.text).not.toContain(heading.trim());
    expect(fragment?.traceIds).toEqual(first.traceIds.filter((id) => id.startsWith("camera.")));
    expect(fragment?.traceIds.every((id) => !id.startsWith("lighting."))).toBe(true);
  });

  it.each([
    ["Deutsch", OUTPUT_CONTRACT_DE],
    ["English", OUTPUT_CONTRACT_EN],
  ])("materializes the complete resolved whole-person output contract in %s", async (promptLanguage, expected) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = cameraSection.provide(state)[0]!;
    const second = cameraSection.provide(state)[0]!;
    const fragment = first.fragments?.find(({ id }) => id === "camera.output-contract");

    expect(first).toEqual(second);
    expect(fragment?.text).toBe(expected);
    expect(fragment?.text.trim()).not.toBe("");
    expect(fragment?.text).not.toContain("ABSOLUTER AUSGABEVERTRAG");
    expect(fragment?.traceIds).toEqual(["camera.framing:camera.framing"]);
  });

  it.each(["Deutsch", "English"])("keeps the output contract framing-aware for upper-body capture in %s", async (promptLanguage) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
      framingV5Id: "framing.upper_body",
    });
    const fragment = cameraSection.provide(state)[0]?.fragments?.find(({ id }) => id === "camera.output-contract");

    expect(fragment).toBeDefined();
    expect(fragment?.text).toContain(promptLanguage === "Deutsch" ? "Oberkörperaufnahme" : "upper-body frame");
    expect(fragment?.text).not.toContain(promptLanguage === "Deutsch" ? "vollständig von Kopf bis Fuß" : "fully visible from head to toe");
    expect(fragment?.traceIds).toEqual(["camera.framing:camera.framing"]);
  });

  it.each([
    ["English", UPPER_BODY_EN],
    ["Deutsch", UPPER_BODY_DE],
  ])("formulates the resolved upper-body framing without reading raw facts in %s", async (promptLanguage, expected) => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage,
      framingV5Id: "framing.upper_body",
      framing: "an intentionally conflicting raw label",
    });
    const first = cameraSection.provide(state)[0]!;
    const second = cameraSection.provide(state)[0]!;
    const fragment = first.fragments?.find(({ id }) => id === "camera.capture");

    expect(state.values).toHaveProperty("camera.framing", "framing.upper_body");
    expect(fragment?.text).toBe(expected);
    expect(fragment?.traceIds).toContain("camera.framing:camera.framing");
    expect(fragment?.traceIds.filter((id) => id.startsWith("camera.framing:"))).toEqual([
      "camera.framing:camera.framing",
    ]);
    expect(second).toEqual(first);
  });

  it("formulates the resolved warm photo look in the camera capture", async () => {
    const state = await resolve({
      ...createCanonicalProjectStateV5Values(),
      promptLanguage: "Deutsch",
      photoLook: "Klar, aber natürlich",
    });
    const fragment = cameraSection.provide(state)[0]?.fragments?.find(({ id }) => id === "camera.capture");

    expect(fragment?.text).toContain("warme Farbbalance mit sanften goldenen Tönen.");
    expect(fragment?.text).not.toContain("natürliche Farbwiedergabe und ausgewogener Kontrast.");
    expect(fragment?.traceIds).toContain("camera.photoLook:camera.photo-look");
  });

  it("does not invent whole-person capture content when resolved framing is absent", async () => {
    const state = await resolve({ promptLanguage: "English" });

    expect(() => cameraSection.provide(state)).toThrow(/camera\.framing/u);
  });
});
