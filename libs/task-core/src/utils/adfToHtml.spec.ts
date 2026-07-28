import { describe, expect, it } from "vitest";

import { adfToHtml } from "./adfToHtml";

describe("adfToHtml", () => {
  it("returns an empty string for missing ADF", () => {
    expect(adfToHtml(undefined)).toBe("");
    expect(adfToHtml(null)).toBe("");
  });

  it("passes through HTML strings unchanged", () => {
    expect(adfToHtml("<p>Already HTML</p>")).toBe("<p>Already HTML</p>");
  });

  it("converts a simple paragraph", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };

    expect(adfToHtml(adf)).toBe("<p>Hello world</p>");
  });

  it("preserves inline marks", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "bold",
              marks: [{ type: "strong" }],
            },
            { type: "text", text: " and " },
            {
              type: "text",
              text: "link",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
      ],
    };

    expect(adfToHtml(adf)).toBe('<p><b>bold</b> and <a href="https://example.com">link</a></p>');
  });

  it("converts headings and lists", () => {
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

    expect(adfToHtml(adf)).toBe("<h2>Title</h2><ul><li><p>Item one</p></li></ul>");
  });

  it("escapes HTML in text nodes", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: '<script>alert("x")</script>' }],
        },
      ],
    };

    expect(adfToHtml(adf)).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>");
  });

  it("converts hard breaks and code blocks", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Line" },
            { type: "hardBreak" },
            { type: "text", text: "Break" },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    };

    expect(adfToHtml(adf)).toBe(
      '<p>Line<br>Break</p><pre><code class="language-ts">const x = 1;</code></pre>',
    );
  });
});
