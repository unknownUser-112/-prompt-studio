import type { PromptDocument, PromptResult } from "./prompt-document";

export interface ProfileLayoutSection {
  readonly sectionId: string;
  readonly order: number;
  readonly separatorBefore?: string;
}

interface TextLayoutBlockBase {
  readonly separatorBefore?: string;
  readonly prefix?: string;
  readonly suffix?: string;
}

export interface TextSectionLayoutBlock extends TextLayoutBlockBase {
  readonly kind: "section";
  readonly sectionId: string;
}

export interface TextFragmentLayoutBlock extends TextLayoutBlockBase {
  readonly kind: "fragment";
  readonly fragmentId: string;
}

export interface TextHeadingLayoutBlock extends TextLayoutBlockBase {
  readonly kind: "heading";
  readonly text: string;
}

export interface TextGroupLayoutBlock extends TextLayoutBlockBase {
  readonly kind: "group";
  readonly heading?: string;
  readonly separatorBetweenChildren?: string;
  readonly children: readonly TextLayoutBlock[];
}

export type TextLayoutBlock =
  | TextSectionLayoutBlock
  | TextFragmentLayoutBlock
  | TextHeadingLayoutBlock
  | TextGroupLayoutBlock;

export interface ProfileLayout {
  readonly id: string;
  readonly sections: readonly ProfileLayoutSection[];
  readonly textBlocks?: readonly TextLayoutBlock[];
}

export interface PromptRenderer<Result extends PromptResult = PromptResult> {
  render(document: PromptDocument, layout: ProfileLayout): Result;
}
