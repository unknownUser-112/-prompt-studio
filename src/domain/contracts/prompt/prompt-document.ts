import type { ResolutionTraceEntry } from "../resolved-state/resolution-trace";

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface PromptFragment {
  readonly id: string;
  readonly sourcePluginId: string;
  readonly sectionId: string;
  readonly order: number;
  readonly text: string;
  readonly trace: readonly ResolutionTraceEntry[];
}

export interface PromptSection {
  readonly id: string;
  readonly sourcePluginId: string;
  readonly slotId: string;
  readonly order: number;
  readonly text: string;
  readonly value: JsonValue;
  readonly trace: readonly ResolutionTraceEntry[];
  readonly fragments: readonly PromptFragment[];
}

export interface PromptDocument {
  readonly astVersion: string;
  readonly id: string;
  readonly stateHash: string;
  readonly sections: readonly PromptSection[];
  readonly trace: readonly ResolutionTraceEntry[];
}

export interface TextPromptResult {
  readonly format: "text";
  readonly documentId: string;
  readonly value: string;
  readonly trace: readonly ResolutionTraceEntry[];
}

export interface JsonPromptResult {
  readonly format: "json";
  readonly documentId: string;
  readonly value: JsonValue;
  readonly serialized: string;
  readonly trace: readonly ResolutionTraceEntry[];
}

export type PromptResult = TextPromptResult | JsonPromptResult;
