import { describe, expect, it } from "vitest";

import type { ProfileLayout } from "../../../src/domain/contracts/prompt/layout";
import type { PromptDocument } from "../../../src/domain/contracts/prompt/prompt-document";
import { TextRenderer } from "../../../src/renderers/text-renderer";

const document: PromptDocument = {
  astVersion: "v1",
  id: "document",
  stateHash: "state",
  trace: [],
  sections: [
    { id: "subject", sourcePluginId: "subject", slotId: "subject", order: 0, text: "Subject", value: "Ada", trace: [] },
    { id: "camera", sourcePluginId: "camera", slotId: "camera", order: 1, text: "Camera", value: "portrait", trace: [] },
  ],
};

describe("TextRenderer", () => {
  it("concatenates only the sections selected by the layout", () => {
    const layout: ProfileLayout = { id: "portrait", sections: [{ sectionId: "camera", order: 0 }, { sectionId: "subject", order: 1 }] };

    expect(new TextRenderer().render(document, layout)).toEqual({
      format: "text",
      documentId: "document",
      value: "Camera\nSubject",
      trace: [],
    });
  });
});
