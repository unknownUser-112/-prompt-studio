import { describe, expect, it } from "vitest";

import { cameraProvider } from "../../../../src/plugins/camera/rules";
import { cameraSection } from "../../../../src/plugins/camera/sections";
import { selfieProvider } from "../../../../src/plugins/selfie/rules";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";
import { createCanonicalProjectStateV5Values } from "../../../../src/domain/entities/project-factory";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [cameraProvider, selfieProvider]);

describe("camera and selfie plugins", () => {
  it("binds a selfie to a smartphone camera and arm-length framing", async () => {
    const state = await resolve({ camera: { selfie: true, device: "mirrorless" } });

    expect(state.values).toEqual({ camera: { device: "smartphone", selfie: true, framing: "arm-length selfie" } });
    expect(new Set(state.trace.entries.map((entry) => entry.ruleId))).toEqual(new Set(["selfie.enabled", "selfie.camera-binding", "selfie.framing-binding"]));
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
});
