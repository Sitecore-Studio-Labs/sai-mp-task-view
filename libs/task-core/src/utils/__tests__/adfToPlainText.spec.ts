import { describe, expect, it } from "vitest";

import { adfToPlainText } from "../adfToPlainText";

describe("adfToPlainText", () => {
  it("returns an empty string for missing ADF", () => {
    expect(adfToPlainText(undefined)).toBe("");
    expect(adfToPlainText(null)).toBe("");
  });

  it("extracts text from a simple paragraph", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };

    expect(adfToPlainText(adf)).toBe("Hello world");
  });

  it("joins multiple paragraphs with single newlines", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second" }],
        },
      ],
    };

    expect(adfToPlainText(adf)).toBe("First\nSecond");
  });

  it("extracts text from headings and list items", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item one" }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(adfToPlainText(adf)).toBe("Title\nItem one");
  });

  it("collapses runs of three or more newlines", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "A" }],
        },
        {
          type: "paragraph",
          content: [],
        },
        {
          type: "paragraph",
          content: [],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "B" }],
        },
      ],
    };

    expect(adfToPlainText(adf)).not.toMatch(/\n{3,}/);
    expect(adfToPlainText(adf)).toContain("A");
    expect(adfToPlainText(adf)).toContain("B");
  });
});
