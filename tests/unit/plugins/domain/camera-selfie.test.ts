import { describe, expect, it } from "vitest";

import { cameraProvider } from "../../../../src/plugins/camera/rules";
import { selfieProvider } from "../../../../src/plugins/selfie/rules";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [cameraProvider, selfieProvider]);

describe("camera and selfie plugins", () => {
  it("binds a selfie to a smartphone camera and arm-length framing", async () => {
    const state = await resolve({ camera: { selfie: true, device: "mirrorless" } });

    expect(state.values).toEqual({ camera: { device: "smartphone", selfie: true, framing: "arm-length selfie" } });
    expect(new Set(state.trace.entries.map((entry) => entry.ruleId))).toEqual(new Set(["selfie.enabled", "selfie.camera-binding", "selfie.framing-binding"]));
  });
});
