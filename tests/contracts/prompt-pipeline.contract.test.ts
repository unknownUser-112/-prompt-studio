import { describe, expect, it } from "vitest";

import type { PromptSectionProvider } from "../../src/contracts/plugins/plugin-registrar";
import type { ResolvedState } from "../../src/domain/contracts/resolved-state/resolved-state";
import { PromptService } from "../../src/application/services/prompt-service";
import type { JsonPromptProjectionBuilder } from "../../src/application/projections/json-prompt-projection-builder";
import type { JsonPromptProjection } from "../../src/domain/contracts/prompt/json-projection";
import { PromptAstBuilder } from "../../src/domain/engines/prompt-ast-builder";
import { JsonRenderer } from "../../src/renderers/json-renderer";
import { TextRenderer } from "../../src/renderers/text-renderer";

describe("prompt pipeline", () => {
  it("uses only resolved state, document, layout and renderer in order", () => {
    const state: ResolvedState = { facts: { values: {} }, values: {}, trace: { entries: [] }, diagnostics: [], stateHash: "b".repeat(64) };
    const providers: readonly PromptSectionProvider[] = [{
      id: "subject",
      provide: () => [{ slotId: "subject", sourcePluginId: "subject", text: "Ada", value: "Ada", traceIds: [] }],
    }];
    const document = new PromptAstBuilder().build(state, providers);
    const result = new PromptService().renderText(state, providers, { id: "default", sections: [{ sectionId: document.sections[0]!.id, order: 0 }] });

    expect(result.value).toBe("Ada");
  });

  it("orchestrates document, JSON projection, layout, and renderer without JSON logic in the service", () => {
    const state: ResolvedState = { facts: { values: {} }, values: {}, trace: { entries: [] }, diagnostics: [], stateHash: "c".repeat(64) };
    const providers: readonly PromptSectionProvider[] = [{
      id: "subject",
      provide: () => [{ slotId: "subject", sourcePluginId: "subject", text: "Ada", value: "Ada", traceIds: [] }],
    }];
    const projectionBuilder = {
      build(document: ReturnType<PromptAstBuilder["build"]>, receivedState: ResolvedState): JsonPromptProjection {
        expect(receivedState).toBe(state);
        return {
          documentId: document.id,
          mode: "normal",
          language: "en",
          sections: { subject: "Ada" },
          structuredSelections: {},
          adaptive: {},
          resolvedState: {},
          trace: document.trace,
        };
      },
    } as JsonPromptProjectionBuilder;
    const service = new PromptService(
      new PromptAstBuilder(),
      new TextRenderer(),
      new JsonRenderer(),
      projectionBuilder,
    );

    const result = service.renderJson(state, providers, {
      id: "json",
      fields: [{ key: "sections", kind: "projection", source: "sections", presence: "required" }],
    });

    expect(result.value).toEqual({ sections: { subject: "Ada" } });
    expect(result.serialized).toBe('{\n  "sections": {\n    "subject": "Ada"\n  }\n}');
  });
});
