import type { ProfileLayout } from "../../domain/contracts/prompt/layout";
import type { JsonProfileLayout } from "../../domain/contracts/prompt/json-layout";
import type { JsonPromptResult, TextPromptResult } from "../../domain/contracts/prompt/prompt-document";
import type { ResolvedState } from "../../domain/contracts/resolved-state/resolved-state";
import { PromptAstBuilder } from "../../domain/engines/prompt-ast-builder";
import { JsonPromptProjectionBuilder } from "../projections/json-prompt-projection-builder";
import { JsonRenderer } from "../../renderers/json-renderer";
import { TextRenderer } from "../../renderers/text-renderer";
import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";

export class PromptService {
  constructor(
    private readonly astBuilder = new PromptAstBuilder(),
    private readonly textRenderer = new TextRenderer(),
    private readonly jsonRenderer = new JsonRenderer(),
    private readonly jsonProjectionBuilder = new JsonPromptProjectionBuilder(),
  ) {}

  renderText(state: ResolvedState, providers: readonly PromptSectionProvider[], layout: ProfileLayout): TextPromptResult {
    return this.textRenderer.render(this.astBuilder.build(state, providers), layout);
  }

  renderJson(state: ResolvedState, providers: readonly PromptSectionProvider[], layout: JsonProfileLayout): JsonPromptResult {
    const document = this.astBuilder.build(state, providers);
    const projection = this.jsonProjectionBuilder.build(document, state);
    return this.jsonRenderer.render(projection, layout);
  }
}
