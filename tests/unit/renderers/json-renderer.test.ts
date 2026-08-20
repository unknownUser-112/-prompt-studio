import { describe, expect, it } from "vitest";

import type { JsonProfileLayout } from "../../../src/domain/contracts/prompt/json-layout";
import type { JsonPromptProjection } from "../../../src/domain/contracts/prompt/json-projection";
import { JsonRenderer } from "../../../src/renderers/json-renderer";

function projection(overrides: Partial<JsonPromptProjection> = {}): JsonPromptProjection {
  return {
    documentId: "document",
    mode: "normal",
    language: "en",
    negativePrompt: ["text", "watermark"],
    sections: { second: 2, first: 1 },
    structuredSelections: { schemaVersion: 5 },
    adaptive: { schemaVersion: 6 },
    resolvedState: { version: "legacy" },
    trace: [],
    ...overrides,
  };
}

describe("JsonRenderer", () => {
  it("materializes literal and projection fields in layout order without sorting nested keys", () => {
    const layout: JsonProfileLayout = {
      id: "standard-json",
      fields: [
        { key: "schema", kind: "literal", value: "4.0" },
        { key: "language", kind: "projection", source: "language", presence: "required" },
        { key: "sections", kind: "projection", source: "sections", presence: "required" },
      ],
    };

    const result = new JsonRenderer().render(projection(), layout);

    expect(result.value).toEqual({ schema: "4.0", language: "en", sections: { second: 2, first: 1 } });
    expect(result.serialized).toBe([
      "{",
      "  \"schema\": \"4.0\",",
      "  \"language\": \"en\",",
      "  \"sections\": {",
      "    \"second\": 2,",
      "    \"first\": 1",
      "  }",
      "}",
    ].join("\n"));
  });

  it.each([
    ["false", false],
    ["zero", 0],
    ["empty string", ""],
    ["empty array", []],
    ["empty object", {}],
    ["null", null],
  ])("retains an optional projection field containing %s", (_label, instructions) => {
    const layout: JsonProfileLayout = {
      id: "safe-json",
      fields: [
        { key: "instructions", kind: "projection", source: "instructions", presence: "omit-if-missing" },
      ],
    };

    const result = new JsonRenderer().render(projection({ instructions: instructions as never }), layout);

    expect(result.value).toEqual({ instructions });
  });

  it("omits only a genuinely missing optional projection field", () => {
    const layout: JsonProfileLayout = {
      id: "safe-json",
      fields: [
        { key: "instructions", kind: "projection", source: "instructions", presence: "omit-if-missing" },
        { key: "sections", kind: "projection", source: "sections", presence: "required" },
      ],
    };

    expect(new JsonRenderer().render(projection(), layout).value).toEqual({ sections: { second: 2, first: 1 } });
  });

  it("throws deterministically when a required projection field is missing", () => {
    const layout: JsonProfileLayout = {
      id: "standard-json",
      fields: [{ key: "prompt", kind: "projection", source: "prompt", presence: "required" }],
    };

    expect(() => new JsonRenderer().render(projection(), layout))
      .toThrowError("JSON_LAYOUT_REQUIRED_FIELD_MISSING prompt from prompt");
  });

  it("rejects duplicate root keys", () => {
    const layout: JsonProfileLayout = {
      id: "invalid",
      fields: [
        { key: "schema", kind: "literal", value: "4.0" },
        { key: "schema", kind: "literal", value: "6.1" },
      ],
    };

    expect(() => new JsonRenderer().render(projection(), layout))
      .toThrowError("JSON_LAYOUT_DUPLICATE_ROOT_KEY schema");
  });

  it("uses native pretty JSON escaping and Unicode without a trailing newline", () => {
    const layout: JsonProfileLayout = {
      id: "unicode",
      fields: [{ key: "value", kind: "literal", value: "Grüße\n\"quoted\"" }],
    };

    const serialized = new JsonRenderer().render(projection(), layout).serialized;

    expect(serialized).toBe('{\n  "value": "Grüße\\n\\\"quoted\\\""\n}');
    expect(serialized.endsWith("\n")).toBe(false);
  });
});
