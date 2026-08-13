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
    { id: "subject", sourcePluginId: "subject", slotId: "subject", order: 0, text: "Subject", value: "Ada", trace: [], fragments: [{ id: "subject.identity", sourcePluginId: "subject", sectionId: "subject", order: 0, text: "Ada bytes", trace: [] }] },
    { id: "camera", sourcePluginId: "camera", slotId: "camera", order: 1, text: "Camera", value: "portrait", trace: [], fragments: [{ id: "camera.capture", sourcePluginId: "camera", sectionId: "camera", order: 0, text: "Camera bytes", trace: [] }] },
    { id: "lighting", sourcePluginId: "lighting", slotId: "lighting", order: 2, text: "Light\nkept byte-for-byte", value: "soft", trace: [], fragments: [{ id: "lighting.capture", sourcePluginId: "lighting", sectionId: "lighting", order: 0, text: "Light\nkept byte-for-byte", trace: [] }] },
    { id: "style", sourcePluginId: "style", slotId: "style", order: 3, text: "Style", value: "natural", trace: [], fragments: [{ id: "style.general", sourcePluginId: "style", sectionId: "style", order: 0, text: "Style bytes", trace: [] }] },
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

  it("uses one LF when a subsequent section declares no separator", () => {
    const layout: ProfileLayout = {
      id: "custom-one-lf",
      sections: [{ sectionId: "subject", order: 0 }, { sectionId: "camera", order: 1 }],
    };

    expect(new TextRenderer().render(document, layout).value).toBe("Subject\nCamera");
  });

  it("uses two LFs when the subsequent section declares a two-LF separator", () => {
    const layout: ProfileLayout = {
      id: "custom-two-lf",
      sections: [{ sectionId: "subject", order: 0 }, { sectionId: "camera", order: 1, separatorBefore: "\n\n" }],
    };

    expect(new TextRenderer().render(document, layout).value).toBe("Subject\n\nCamera");
  });

  it("places mixed separators only between byte-unchanged sections", () => {
    const layout: ProfileLayout = {
      id: "custom-four-sections",
      sections: [
        { sectionId: "subject", order: 0, separatorBefore: "ignored-before-first" },
        { sectionId: "lighting", order: 1, separatorBefore: "\n\n" },
        { sectionId: "camera", order: 2, separatorBefore: "\n" },
        { sectionId: "style", order: 3, separatorBefore: "\n\n" },
      ],
    };

    const renderer = new TextRenderer();
    const first = renderer.render(document, layout).value;
    const second = renderer.render(document, layout).value;

    expect(first).toBe("Subject\n\nLight\nkept byte-for-byte\nCamera\n\nStyle");
    expect(first.startsWith("\n")).toBe(false);
    expect(first.endsWith("\n")).toBe(false);
    expect(second).toBe(first);
  });

  it("renders typed fragment groups with static headings, prefixes and suffixes", () => {
    const layout: ProfileLayout = {
      id: "custom-block-layout",
      sections: [
        { sectionId: "subject", order: 0 },
        { sectionId: "camera", order: 1 },
      ],
      textBlocks: [{
        kind: "group",
        heading: "IMAGE GOAL",
        prefix: "[",
        suffix: "]",
        separatorBetweenChildren: " + ",
        children: [
          { kind: "fragment", fragmentId: "subject.identity" },
          { kind: "fragment", fragmentId: "camera.capture" },
        ],
      }],
    };

    const renderer = new TextRenderer();
    const first = renderer.render(document, layout).value;
    const second = renderer.render(document, layout).value;

    expect(first).toBe("[IMAGE GOAL\nAda bytes + Camera bytes]");
    expect(second).toBe(first);
  });

  it("renders section and heading blocks without analyzing their bytes", () => {
    const layout: ProfileLayout = {
      id: "generic-block-layout",
      sections: [{ sectionId: "lighting", order: 0 }],
      textBlocks: [
        { kind: "heading", text: "STATIC\nBYTES", suffix: "\n" },
        { kind: "section", sectionId: "lighting", separatorBefore: "" },
      ],
    };

    expect(new TextRenderer().render(document, layout).value).toBe("STATIC\nBYTES\nLight\nkept byte-for-byte");
  });

  it("rejects a layout block that references a missing section or fragment", () => {
    const renderer = new TextRenderer();
    const base = { id: "missing", sections: [{ sectionId: "subject", order: 0 }] } as const;

    expect(() => renderer.render(document, { ...base, textBlocks: [{ kind: "section", sectionId: "missing" }] }))
      .toThrow(/unknown section/i);
    expect(() => renderer.render(document, { ...base, textBlocks: [{ kind: "fragment", fragmentId: "missing.fragment" }] }))
      .toThrow(/unknown fragment/i);
  });
});
