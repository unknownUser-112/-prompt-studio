import { describe, expect, it } from "vitest";

import type { PromptSectionProvider } from "../../../src/contracts/plugins/plugin-registrar";
import type { ResolvedState } from "../../../src/domain/contracts/resolved-state/resolved-state";
import { PromptAstBuilder } from "../../../src/domain/engines/prompt-ast-builder";
import { cameraSection } from "../../../src/plugins/camera/sections";
import { selfieSection } from "../../../src/plugins/selfie/sections";

const traceEntry = {
  id: "camera.framing",
  path: "camera.framing",
  sourceField: "camera.framing",
  ruleId: "camera.framing",
  ruleVersion: "1.0.0",
  sourcePluginId: "camera",
  pluginVersion: "1.0.0",
} as const;

const subjectTraceEntry = {
  ...traceEntry,
  id: "subject.name",
  path: "subject.name",
  sourcePluginId: "a.subject",
} as const;

const cameraTraceEntry = {
  ...traceEntry,
  id: "camera.framing.z",
  sourcePluginId: "z.camera",
} as const;

const state: ResolvedState = {
  facts: { values: {} },
  values: { camera: { framing: "portrait" } },
  trace: { entries: [subjectTraceEntry, cameraTraceEntry] },
  diagnostics: [],
  stateHash: "a".repeat(64),
};

describe("PromptAstBuilder", () => {
  it("builds a deeply immutable canonical document with stable IDs and null-based order", () => {
    const providers: readonly PromptSectionProvider[] = [
      {
        id: "z.camera",
        provide: () => [{
          slotId: "camera",
          sourcePluginId: "z.camera",
          text: "Portrait camera",
          value: { framing: "portrait" },
          traceIds: [cameraTraceEntry.id],
        }],
      },
      {
        id: "a.subject",
        provide: () => [{
          slotId: "subject",
          sourcePluginId: "a.subject",
          text: "Subject",
          value: "Ada",
          traceIds: [subjectTraceEntry.id],
        }],
      },
    ];

    const builder = new PromptAstBuilder();
    const first = builder.build(state, providers);
    const second = builder.build(state, [...providers].reverse());

    expect(first).toEqual(second);
    expect(first.id).toBe(`v1:${state.stateHash}`);
    expect(first.sections.map((section) => [section.sourcePluginId, section.slotId, section.order]))
      .toEqual([["a.subject", "subject", 0], ["z.camera", "camera", 1]]);
    expect(first.sections[0]?.trace).toEqual([subjectTraceEntry]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.sections)).toBe(true);
    expect(Object.isFrozen(first.sections[0])).toBe(true);
    expect(Object.isFrozen(first.sections[0]?.value)).toBe(true);
  });

  it("rejects invalid slots, duplicate plugin slots, mismatched sources and incomplete traces", () => {
    const builder = new PromptAstBuilder();
    const cameraState: ResolvedState = {
      ...state,
      trace: { entries: [{ ...traceEntry, id: "camera.framing", sourcePluginId: "camera" }] },
    };

    expect(() => builder.build(cameraState, [{
      id: "camera",
      provide: () => [{ slotId: "Bad slot", sourcePluginId: "camera", text: "x", value: null, traceIds: [traceEntry.id] }],
    }])).toThrow(/slot/i);
    expect(() => builder.build(cameraState, [{
      id: "camera",
      provide: () => [
        { slotId: "camera", sourcePluginId: "camera", text: "x", value: null, traceIds: [traceEntry.id] },
        { slotId: "camera", sourcePluginId: "camera", text: "y", value: null, traceIds: [traceEntry.id] },
      ],
    }])).toThrow(/duplicate/i);
    expect(() => builder.build(cameraState, [{
      id: "camera",
      provide: () => [{ slotId: "camera", sourcePluginId: "other", text: "x", value: null, traceIds: [traceEntry.id] }],
    }])).toThrow(/source/i);
    expect(() => builder.build(cameraState, [{
      id: "camera",
      provide: () => [{ slotId: "camera", sourcePluginId: "camera", text: "x", value: null, traceIds: [] }],
    }])).toThrow(/trace/i);
  });

  it("rejects a cross-plugin resolution trace", () => {
    expect(() => new PromptAstBuilder().build(state, [{
      id: "a.subject",
      provide: () => [{
        slotId: "subject",
        sourcePluginId: "a.subject",
        text: "Subject",
        value: "Ada",
        traceIds: [cameraTraceEntry.id],
      }],
    }, {
      id: "z.camera",
      provide: () => [{
        slotId: "camera",
        sourcePluginId: "z.camera",
        text: "Camera",
        value: "portrait",
        traceIds: [subjectTraceEntry.id],
      }],
    }])).toThrow(/trace.*source/i);
  });

  it("sorts canonically by code units independent of locale", () => {
    const composedTrace = { ...traceEntry, id: "composed", sourcePluginId: "é" };
    const decomposedTrace = { ...traceEntry, id: "decomposed", sourcePluginId: "e\u0301" };
    const unicodeState: ResolvedState = { ...state, trace: { entries: [composedTrace, decomposedTrace] } };
    const providers: readonly PromptSectionProvider[] = [{
      id: "é",
      provide: () => [{ slotId: "slot", sourcePluginId: "é", text: "composed", value: null, traceIds: ["composed"] }],
    }, {
      id: "e\u0301",
      provide: () => [{ slotId: "slot", sourcePluginId: "e\u0301", text: "decomposed", value: null, traceIds: ["decomposed"] }],
    }];

    expect(new PromptAstBuilder().build(unicodeState, providers).sections.map((section) => section.sourcePluginId))
      .toEqual(["e\u0301", "é"]);
  });

  it("accepts existing plugin section providers without giving them a new value source", () => {
    const existingState: ResolvedState = {
      ...state,
      values: { camera: { framing: "portrait" }, selfie: { enabled: true } },
      trace: {
        entries: [
          traceEntry,
          { ...traceEntry, id: "selfie.enabled", path: "selfie.enabled", sourcePluginId: "selfie" },
        ],
      },
    };

    const first = new PromptAstBuilder().build(existingState, [selfieSection, cameraSection]);
    const second = new PromptAstBuilder().build(existingState, [cameraSection, selfieSection]);

    expect(first).toEqual(second);
    expect(first.sections.map((section) => section.value)).toEqual([
      [{ path: "camera.framing", value: "portrait" }],
      [{ path: "selfie.enabled", value: true }],
    ]);
    expect(first.sections.flatMap((section) => section.trace.map((entry) => entry.id)))
      .toEqual(["camera.framing", "selfie.enabled"]);
  });
});
