import type { JsonValue } from "./prompt-document";

export type JsonProjectionField =
  | "language"
  | "prompt"
  | "instructions"
  | "negativePrompt"
  | "sections"
  | "metadata"
  | "structuredSelections"
  | "adaptive"
  | "resolvedState"
  | "characterSheet"
  | "photographicCapture";

export interface JsonLiteralLayoutField {
  readonly key: string;
  readonly kind: "literal";
  readonly value: JsonValue;
}

export interface JsonProjectionLayoutField {
  readonly key: string;
  readonly kind: "projection";
  readonly source: JsonProjectionField;
  readonly presence: "required" | "omit-if-missing";
}

export type JsonLayoutField = JsonLiteralLayoutField | JsonProjectionLayoutField;

export interface JsonProfileLayout {
  readonly id: string;
  readonly fields: readonly JsonLayoutField[];
}

