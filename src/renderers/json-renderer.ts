import type { JsonProfileLayout, JsonProjectionField } from "../domain/contracts/prompt/json-layout";
import type { JsonPromptProjection } from "../domain/contracts/prompt/json-projection";
import type { JsonPromptResult, JsonValue } from "../domain/contracts/prompt/prompt-document";

export class JsonRenderer {
  render(projection: JsonPromptProjection, layout: JsonProfileLayout): JsonPromptResult {
    const value: Record<string, JsonValue> = {};
    const keys = new Set<string>();

    for (const field of layout.fields) {
      if (keys.has(field.key)) throw new Error(`JSON_LAYOUT_DUPLICATE_ROOT_KEY ${field.key}`);
      keys.add(field.key);

      if (field.kind === "literal") {
        value[field.key] = field.value;
        continue;
      }

      const projected = readProjectionField(projection, field.source);
      if (projected === undefined) {
        if (field.presence === "required") {
          throw new Error(`JSON_LAYOUT_REQUIRED_FIELD_MISSING ${field.key} from ${field.source}`);
        }
        continue;
      }
      value[field.key] = projected;
    }

    const frozenValue = Object.freeze(value);
    return Object.freeze({
      format: "json" as const,
      documentId: projection.documentId,
      value: frozenValue,
      serialized: JSON.stringify(frozenValue, null, 2),
      trace: projection.trace,
    });
  }
}

function readProjectionField(
  projection: JsonPromptProjection,
  source: JsonProjectionField,
): JsonValue | undefined {
  return projection[source];
}
