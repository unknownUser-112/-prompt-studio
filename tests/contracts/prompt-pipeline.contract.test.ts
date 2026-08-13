import { describe, expect, it } from "vitest";

import type { PromptSectionProvider } from "../../src/contracts/plugins/plugin-registrar";
import type { ResolvedState } from "../../src/domain/contracts/resolved-state/resolved-state";
import { PromptService } from "../../src/application/services/prompt-service";
import { PromptAstBuilder } from "../../src/domain/engines/prompt-ast-builder";

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
});
