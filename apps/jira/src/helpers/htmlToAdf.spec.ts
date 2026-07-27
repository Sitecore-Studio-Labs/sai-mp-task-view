import { describe, expect, it } from "vitest";

import { htmlToAdf } from "./htmlToAdf";

describe("htmlToAdf", () => {
  it("preserves textColor from TipTap color spans", () => {
    const adf = htmlToAdf('<p>Hi <span style="color: #dc2626">red</span> text</p>');
    expect(adf).toEqual({
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hi " },
            {
              type: "text",
              text: "red",
              marks: [{ type: "textColor", attrs: { color: "#dc2626" } }],
            },
            { type: "text", text: " text" },
          ],
        },
      ],
    });
  });

  it("converts rgb colors to hex", () => {
    const adf = htmlToAdf('<p><span style="color: rgb(220, 38, 38)">red</span></p>');
    const text = (adf.content?.[0] as { content?: Array<{ marks?: unknown[] }> }).content?.[0];
    expect(text?.marks).toEqual([{ type: "textColor", attrs: { color: "#dc2626" } }]);
  });

  it("preserves TipTap strong/s marks without remapping", () => {
    const adf = htmlToAdf("<p><strong>bold</strong> <s>strike</s></p>");
    expect(adf.content).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "bold", marks: [{ type: "strong" }] },
          { type: "text", text: " " },
          { type: "text", text: "strike", marks: [{ type: "strike" }] },
        ],
      },
    ]);
  });

  it("combines color with bold", () => {
    const adf = htmlToAdf('<p><span style="color: #2563eb"><strong>blue bold</strong></span></p>');
    expect(adf.content).toEqual([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "blue bold",
            marks: [{ type: "textColor", attrs: { color: "#2563eb" } }, { type: "strong" }],
          },
        ],
      },
    ]);
  });
});
