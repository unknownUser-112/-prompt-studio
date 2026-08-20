import type { JsonProfileLayout } from "../domain/contracts/prompt/json-layout";
import type { JsonPromptProjectionMode } from "../domain/contracts/prompt/json-projection";
import { JSON_LEGACY_PROFILE_VERSION, jsonLiteralField, jsonProjectionField } from "./json-shared";
import { PROFILE_IDS } from "./profile-ids";

export function createStandardJsonLayout(mode: JsonPromptProjectionMode): JsonProfileLayout {
  return mode === "characterSheet" ? characterSheetLayout() : normalLayout();
}

function normalLayout(): JsonProfileLayout {
  return {
    id: PROFILE_IDS.standardJson,
    fields: [
      jsonLiteralField("schema", "4.0"),
      jsonLiteralField("version", JSON_LEGACY_PROFILE_VERSION),
      jsonLiteralField("format", "compact-standard-image-prompt"),
      jsonProjectionField("language", "language"),
      jsonLiteralField("profile", PROFILE_IDS.standardJson),
      jsonProjectionField("prompt", "prompt"),
      jsonProjectionField("negativePrompt", "negativePrompt"),
      jsonProjectionField("sections", "sections"),
      jsonProjectionField("metadata", "metadata"),
      jsonProjectionField("structuredSelections", "structuredSelections"),
      jsonProjectionField("adaptive", "adaptive"),
      jsonProjectionField("resolvedState", "resolvedState"),
    ],
  };
}

function characterSheetLayout(): JsonProfileLayout {
  return {
    id: PROFILE_IDS.standardJson,
    fields: [
      jsonLiteralField("schema", "6.1"),
      jsonLiteralField("version", JSON_LEGACY_PROFILE_VERSION),
      jsonLiteralField("profile", PROFILE_IDS.standardJson),
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
