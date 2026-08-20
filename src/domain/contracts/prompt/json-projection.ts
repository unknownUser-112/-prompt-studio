import type { ResolutionTraceEntry } from "../resolved-state/resolution-trace";
import type { JsonValue } from "./prompt-document";

export type JsonPromptProjectionMode = "normal" | "characterSheet";
export type JsonPromptLanguage = "de" | "en";

export interface JsonPromptProjection {
  readonly documentId: string;
  readonly mode: JsonPromptProjectionMode;
  readonly language: JsonPromptLanguage;
  readonly prompt?: string;
  readonly instructions?: readonly string[];
  readonly negativePrompt?: readonly string[];
  readonly sections: JsonValue;
  readonly metadata?: JsonValue;
  readonly structuredSelections: JsonValue;
  readonly adaptive: JsonValue;
  readonly resolvedState: JsonValue;
  readonly characterSheet?: JsonValue;
  readonly photographicCapture?: JsonValue;
  /** Internal result provenance. This field is never addressable by a JSON profile layout. */
  readonly trace: readonly ResolutionTraceEntry[];
}
