import type { ProfileLayout, PromptRenderer } from "../domain/contracts/prompt/layout";
import type { PromptDocument, TextPromptResult } from "../domain/contracts/prompt/prompt-document";
import { selectLayoutSections } from "../domain/engines/prompt-ast-builder";

export class TextRenderer implements PromptRenderer<TextPromptResult> {
  render(document: PromptDocument, layout: ProfileLayout): TextPromptResult {
    const sections = selectLayoutSections(document, layout);
    return Object.freeze({
      format: "text" as const,
      documentId: document.id,
      value: sections.map((section) => section.text).join("\n"),
      trace: Object.freeze(sections.flatMap((section) => section.trace)),
    });
  }
}
