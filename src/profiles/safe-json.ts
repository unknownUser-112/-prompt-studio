import type { JsonProfileLayout } from "../domain/contracts/prompt/json-layout";
import type { JsonPromptProjectionMode } from "../domain/contracts/prompt/json-projection";
import {
  JSON_LEGACY_PROFILE_VERSION,
  createJsonCharacterSheetLayout,
  jsonLiteralField,
  jsonProjectionField,
} from "./json-shared";
import { PROFILE_IDS } from "./profile-ids";

const SAFE_IMAGE_CONTRACT = Object.freeze({
  adultOnly: true,
  nonsexualizedEditorialOrLifestyle: true,
  singleImage: true,
});

export function createSafeJsonLayout(mode: JsonPromptProjectionMode): JsonProfileLayout {
  return mode === "characterSheet" ? createJsonCharacterSheetLayout(PROFILE_IDS.safeJson) : normalLayout();
}

function normalLayout(): JsonProfileLayout {
  return {
    id: PROFILE_IDS.safeJson,
    fields: [
      jsonLiteralField("schema", "4.0"),
      jsonLiteralField("version", JSON_LEGACY_PROFILE_VERSION),
      jsonLiteralField("format", "compact-safe-image-brief"),
      jsonProjectionField("language", "language"),
      jsonLiteralField("profile", PROFILE_IDS.safeJson),
      jsonLiteralField("safety", SAFE_IMAGE_CONTRACT),
      jsonProjectionField("sections", "sections"),
      jsonProjectionField("negativePrompt", "negativePrompt"),
      jsonProjectionField("metadata", "metadata"),
      jsonProjectionField("structuredSelections", "structuredSelections"),
      jsonProjectionField("adaptive", "adaptive"),
      jsonProjectionField("instructions", "instructions", "omit-if-missing"),
      jsonProjectionField("resolvedState", "resolvedState"),
    ],
  };
}
