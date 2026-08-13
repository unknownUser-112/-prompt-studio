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
          fragments: [{ id: "camera.capture", text: "Portrait camera", traceIds: [cameraTraceEntry.id] }],
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
    expect(first.sections[1]?.fragments).toEqual([{
      id: "camera.capture",
      sourcePluginId: "z.camera",
      sectionId: "v1:z.camera:camera",
      order: 0,
      text: "Portrait camera",
      trace: [cameraTraceEntry],
    }]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.sections)).toBe(true);
    expect(Object.isFrozen(first.sections[0])).toBe(true);
    expect(Object.isFrozen(first.sections[0]?.value)).toBe(true);
    expect(Object.isFrozen(first.sections[1]?.fragments)).toBe(true);
    expect(Object.isFrozen(first.sections[1]?.fragments[0])).toBe(true);
  });

  it("preserves deterministic semantic fragments with exact trace coverage", () => {
    const builder = new PromptAstBuilder();
    const cameraState: ResolvedState = {
      ...state,
      trace: { entries: [{ ...traceEntry, id: "camera.framing", sourcePluginId: "camera" }] },
    };
    const provider: PromptSectionProvider = {
      id: "camera",
      provide: () => [{
        slotId: "camera",
        sourcePluginId: "camera",
        text: "Heading\nCamera bytes",
        value: null,
        traceIds: [traceEntry.id],
        fragments: [{ id: "camera.capture", text: "Camera bytes", traceIds: [traceEntry.id] }],
      }],
    };

    const first = builder.build(cameraState, [provider]);
    const second = builder.build(cameraState, [provider]);

    expect(first).toEqual(second);
    expect(first.sections[0]?.text).toBe("Heading\nCamera bytes");
    expect(first.sections[0]?.fragments[0]?.id).toBe("camera.capture");
    expect(first.sections[0]?.fragments[0]?.text).toBe("Camera bytes");
    expect(first.sections[0]?.fragments[0]?.trace).toEqual([cameraState.trace.entries[0]]);

    expect(() => builder.build(cameraState, [{
      id: "camera",
      provide: () => [{
        slotId: "camera",
        sourcePluginId: "camera",
        text: "x",
        value: null,
        traceIds: [traceEntry.id],
        fragments: [
          { id: "camera.capture", text: "x", traceIds: [traceEntry.id] },
          { id: "camera.capture", text: "y", traceIds: [traceEntry.id] },
        ],
      }],
    }])).toThrow(/duplicate.*fragment/i);
  });

  it("accepts an existing cross-provider trace without rewriting its metadata", () => {
    const externalTrace = { ...traceEntry, id: "lighting.source:camera.binding", path: "lighting.source", sourcePluginId: "camera" };
    const crossProviderState: ResolvedState = { ...state, trace: { entries: [externalTrace] } };
    const document = new PromptAstBuilder().build(crossProviderState, [{
      id: "scene-lighting",
      provide: () => [{
        slotId: "lighting",
        sourcePluginId: "scene-lighting",
        text: "Window light",
        value: null,
        traceIds: [],
        fragments: [{ id: "lighting.capture", text: "Window light", traceIds: [externalTrace.id] }],
      }],
    }]);

    expect(document.sections[0]?.fragments[0]?.sourcePluginId).toBe("scene-lighting");
    expect(document.sections[0]?.fragments[0]?.trace).toEqual([externalTrace]);
    expect(document.sections[0]?.fragments[0]?.trace[0]).toBe(document.trace[0]);
  });

  it("rejects invalid explicit fragment collections and canonicalizes trace order", () => {
    const secondTrace = { ...traceEntry, id: "camera.device", path: "camera.device", sourcePluginId: "camera" };
    const cameraState: ResolvedState = { ...state, trace: { entries: [traceEntry, secondTrace] } };
    const build = (fragments: readonly { id: string; text: string; traceIds: readonly string[] }[]) => new PromptAstBuilder().build(cameraState, [{
      id: "camera",
      provide: () => [{ slotId: "camera", sourcePluginId: "camera", text: "Camera", value: null, traceIds: [traceEntry.id, secondTrace.id], fragments }],
    }]);

    expect(() => build([])).toThrow(/fragment.*empty/i);
    expect(() => build([{ id: "camera.capture", text: "  \n", traceIds: [traceEntry.id] }])).toThrow(/fragment.*text/i);
    expect(() => build([{ id: "camera.capture", text: "Camera", traceIds: [] }])).toThrow(/fragment.*trace/i);
    expect(() => build([{ id: "camera.capture", text: "Camera", traceIds: [traceEntry.id, traceEntry.id] }])).toThrow(/duplicate.*trace/i);
    expect(() => build([{ id: "camera.capture", text: "Camera", traceIds: ["missing"] }])).toThrow(/unknown.*trace/i);
    expect(build([{ id: "camera.capture", text: "Camera", traceIds: [traceEntry.id, secondTrace.id] }]).sections[0]?.fragments[0]?.trace.map(({ id }) => id))
      .toEqual([secondTrace.id, traceEntry.id]);
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
