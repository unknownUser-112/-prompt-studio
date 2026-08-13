import type { ProfileLayout, PromptRenderer, TextLayoutBlock } from "../domain/contracts/prompt/layout";
import type { PromptDocument, PromptFragment, PromptSection, TextPromptResult } from "../domain/contracts/prompt/prompt-document";
import { selectLayoutSections } from "../domain/engines/prompt-ast-builder";

const DEFAULT_TEXT_SECTION_SEPARATOR = "\n";

export class TextRenderer implements PromptRenderer<TextPromptResult> {
  render(document: PromptDocument, layout: ProfileLayout): TextPromptResult {
    const sections = selectLayoutSections(document, layout);
    const sectionsById = new Map(sections.map((section) => [section.id, section]));
    const fragmentsById = new Map(sections.flatMap((section) => section.fragments).map((fragment) => [fragment.id, fragment]));
    const blocks: readonly TextLayoutBlock[] = layout.textBlocks ?? layout.sections.map((section) => ({
      kind: "section" as const,
      sectionId: section.sectionId,
      separatorBefore: section.separatorBefore,
    }));
    const rendered = this.renderSequence(blocks, sectionsById, fragmentsById, DEFAULT_TEXT_SECTION_SEPARATOR);
    return Object.freeze({
      format: "text" as const,
      documentId: document.id,
      value: rendered.text,
      trace: Object.freeze(rendered.trace),
    });
  }

  private renderSequence(
    blocks: readonly TextLayoutBlock[],
    sectionsById: ReadonlyMap<string, PromptSection>,
    fragmentsById: ReadonlyMap<string, PromptFragment>,
    defaultSeparator: string,
  ): { readonly text: string; readonly trace: readonly PromptFragment["trace"][number][] } {
    const trace: PromptFragment["trace"][number][] = [];
    const text = blocks.map((block, index) => {
      const rendered = this.renderBlock(block, sectionsById, fragmentsById);
      trace.push(...rendered.trace);
      return `${index === 0 ? "" : (block.separatorBefore ?? defaultSeparator)}${rendered.text}`;
    }).join("");
    return { text, trace };
  }

  private renderBlock(
    block: TextLayoutBlock,
    sectionsById: ReadonlyMap<string, PromptSection>,
    fragmentsById: ReadonlyMap<string, PromptFragment>,
  ): { readonly text: string; readonly trace: readonly PromptFragment["trace"][number][] } {
    let rendered: { readonly text: string; readonly trace: readonly PromptFragment["trace"][number][] };
    if (block.kind === "section") {
      const section = sectionsById.get(block.sectionId);
      if (section === undefined) throw new Error(`Text layout references unknown section: ${block.sectionId}`);
      rendered = { text: section.text, trace: section.trace };
    } else if (block.kind === "fragment") {
      const fragment = fragmentsById.get(block.fragmentId);
      if (fragment === undefined) throw new Error(`Text layout references unknown fragment: ${block.fragmentId}`);
      rendered = { text: fragment.text, trace: fragment.trace };
    } else if (block.kind === "heading") {
      rendered = { text: block.text, trace: [] };
    } else {
      const children = this.renderSequence(
        block.children,
        sectionsById,
        fragmentsById,
        block.separatorBetweenChildren ?? DEFAULT_TEXT_SECTION_SEPARATOR,
      );
      rendered = {
        text: block.heading === undefined ? children.text : `${block.heading}${children.text === "" ? "" : `\n${children.text}`}`,
        trace: children.trace,
      };
    }
    return { text: `${block.prefix ?? ""}${rendered.text}${block.suffix ?? ""}`, trace: rendered.trace };
  }
}
