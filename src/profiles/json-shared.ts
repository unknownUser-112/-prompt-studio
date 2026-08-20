import type {
  JsonLiteralLayoutField,
  JsonProfileLayout,
  JsonProjectionField,
  JsonProjectionLayoutField,
} from "../domain/contracts/prompt/json-layout";
import type { JsonValue } from "../domain/contracts/prompt/prompt-document";
import { PROFILE_IDS } from "./profile-ids";

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

export function createJsonCharacterSheetLayout(
  profileId: typeof PROFILE_IDS.standardJson | typeof PROFILE_IDS.safeJson,
): JsonProfileLayout {
  return {
    id: profileId,
    fields: [
      jsonLiteralField("schema", "6.1"),
      jsonLiteralField("version", JSON_LEGACY_PROFILE_VERSION),
      jsonLiteralField("profile", profileId),
      jsonLiteralField("mode", "character_sheet"),
      jsonProjectionField("language", "language"),
      jsonProjectionField("characterSheet", "characterSheet"),
      jsonProjectionField("photographicCapture", "photographicCapture"),
      jsonProjectionField("prompt", "prompt"),
      jsonProjectionField("structuredSelections", "structuredSelections"),
      jsonProjectionField("sections", "sections"),
      jsonProjectionField("adaptive", "adaptive"),
      jsonProjectionField("resolvedState", "resolvedState"),
    ],
  };
}
