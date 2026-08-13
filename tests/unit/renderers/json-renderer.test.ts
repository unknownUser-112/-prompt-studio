import { describe, expect, it } from "vitest";

import type { ProfileLayout } from "../../../src/domain/contracts/prompt/layout";
import type { PromptDocument } from "../../../src/domain/contracts/prompt/prompt-document";
import { JsonRenderer } from "../../../src/renderers/json-renderer";

describe("JsonRenderer", () => {
  it("serializes the selected AST sections into canonical valid JSON without adding values", () => {
    const document: PromptDocument = {
      astVersion: "v1", id: "document", stateHash: "state", trace: [],
      sections: [{ id: "subject", sourcePluginId: "subject", slotId: "subject", order: 0, text: "Subject", value: { name: "Ada" }, trace: [] }],
    };
    const layout: ProfileLayout = { id: "portrait", sections: [{ sectionId: "subject", order: 0 }] };

    const result = new JsonRenderer().render(document, layout);

    expect(result.format).toBe("json");
    expect(JSON.parse(result.serialized)).toEqual(result.value);
    expect(result.value).toEqual({ id: "document", sections: [{ id: "subject", value: { name: "Ada" } }] });
  });

  it("sorts canonical JSON object keys by code units rather than locale", () => {
    const document: PromptDocument = {
      astVersion: "v1", id: "document", stateHash: "state", trace: [],
      sections: [{ id: "subject", sourcePluginId: "subject", slotId: "subject", order: 0, text: "Subject", value: { "é": 1, "e\u0301": 2 }, trace: [] }],
    };
    const layout: ProfileLayout = { id: "portrait", sections: [{ sectionId: "subject", order: 0 }] };

    expect(new JsonRenderer().render(document, layout).serialized)
      .toBe('{"id":"document","sections":[{"id":"subject","value":{"é":2,"é":1}}]}');
  });
});
