import type { PromptDocument, PromptResult } from "./prompt-document";

export interface ProfileLayoutSection {
  readonly sectionId: string;
  readonly order: number;
}

export interface ProfileLayout {
  readonly id: string;
  readonly sections: readonly ProfileLayoutSection[];
}

export interface PromptRenderer<Result extends PromptResult = PromptResult> {
  render(document: PromptDocument, layout: ProfileLayout): Result;
}
