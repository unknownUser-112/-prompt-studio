import type { ProfileLayout, PromptRenderer } from "../domain/contracts/prompt/layout";
import type { JsonPromptResult, JsonValue, PromptDocument } from "../domain/contracts/prompt/prompt-document";
import { selectLayoutSections } from "../domain/engines/prompt-ast-builder";

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Readonly<Record<string, JsonValue>>;
  return `{${Object.keys(object).sort(compareCodeUnits).map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key]!)}`).join(",")}}`;
}

export class JsonRenderer implements PromptRenderer<JsonPromptResult> {
  render(document: PromptDocument, layout: ProfileLayout): JsonPromptResult {
    const sections = selectLayoutSections(document, layout);
    const value: JsonValue = {
      id: document.id,
      sections: sections.map((section) => ({ id: section.id, value: section.value })),
    };
    return Object.freeze({
      format: "json" as const,
      documentId: document.id,
      value,
      serialized: canonicalJson(value),
      trace: Object.freeze(sections.flatMap((section) => section.trace)),
    });
  }
}
