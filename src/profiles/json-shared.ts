import type {
  JsonLiteralLayoutField,
  JsonProjectionField,
  JsonProjectionLayoutField,
} from "../domain/contracts/prompt/json-layout";
import type { JsonValue } from "../domain/contracts/prompt/prompt-document";

export const JSON_LEGACY_PROFILE_VERSION = "V500.6.11-Binding-Selfie-Open-Garment-State";

export function jsonLiteralField(key: string, value: JsonValue): JsonLiteralLayoutField {
  return { key, kind: "literal", value };
}

export function jsonProjectionField(
  key: string,
  source: JsonProjectionField,
  presence: JsonProjectionLayoutField["presence"] = "required",
): JsonProjectionLayoutField {
  return { key, kind: "projection", source, presence };
}
