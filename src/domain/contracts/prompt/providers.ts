import type { JsonValue } from "./prompt-document";

export interface PromptFragmentDraft {
  readonly id: string;
  readonly text: string;
  readonly traceIds: readonly string[];
}

export interface PromptSectionDraft {
  readonly slotId: string;
  readonly sourcePluginId: string;
  readonly text: string;
  readonly value: JsonValue;
  readonly traceIds: readonly string[];
  readonly fragments?: readonly PromptFragmentDraft[];
}
