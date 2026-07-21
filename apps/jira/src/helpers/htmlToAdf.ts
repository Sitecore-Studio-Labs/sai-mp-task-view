import parse from "html-dom-parser";

type AdfMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

type AdfNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
  content?: AdfNode[];
  version?: number;
};

type DomNode = {
  type?: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
};

function extractColor(style: string | undefined): string | null {
  if (!style) return null;
  const hex = style.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-fA-F]{3,8})\s*(?:;|$)/i);
  if (hex?.[1]) return normalizeHex(hex[1]);

  const rgb = style.match(/(?:^|;)\s*color\s*:\s*rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
  if (rgb) {
    const toHex = (n: string) => Number(n).toString(16).padStart(2, "0");
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }
  return null;
}

function normalizeHex(hex: string): string {
  if (hex.length === 4) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return hex.toLowerCase();
}

function markForTag(node: DomNode): AdfMark | null {
  const name = (node.name ?? "").toLowerCase();
  switch (name) {
    case "strong":
    case "b":
      return { type: "strong" };
    case "em":
    case "i":
      return { type: "em" };
    case "s":
    case "del":
    case "strike":
      return { type: "strike" };
    case "u":
      return { type: "underline" };
    case "code":
      return { type: "code" };
    case "a": {
      const href = node.attribs?.href;
      if (!href) return null;
      return { type: "link", attrs: { href } };
    }
    case "span": {
      const color = extractColor(node.attribs?.style);
      if (!color) return null;
      return { type: "textColor", attrs: { color } };
    }
    default:
      return null;
  }
}

function isInlineMarkTag(name: string): boolean {
  return ["strong", "b", "em", "i", "s", "del", "strike", "u", "code", "a", "span"].includes(
    name.toLowerCase(),
  );
}

function processInline(node: DomNode, marks: AdfMark[] = []): AdfNode[] {
  if (node.type === "text") {
    const text = node.data ?? "";
    if (text.length === 0) return [];
    return [
      {
        type: "text",
        text,
        ...(marks.length > 0 ? { marks: marks.map((m) => ({ ...m })) } : {}),
      },
    ];
  }

  if (node.type !== "tag") return [];

  const name = (node.name ?? "").toLowerCase();
  if (name === "br") {
    return [{ type: "hardBreak" }];
  }

  const nextMarks = [...marks];
  if (isInlineMarkTag(name)) {
    const mark = markForTag(node);
    if (mark) nextMarks.push(mark);
  }

  const out: AdfNode[] = [];
  for (const child of node.children ?? []) {
    out.push(...processInline(child, nextMarks));
  }
  return out;
}

function paragraphFromInline(nodes: AdfNode[]): AdfNode {
  return { type: "paragraph", content: nodes };
}

function processListItem(li: DomNode): AdfNode {
  const children = li.children ?? [];
  const content: AdfNode[] = [];

  for (const child of children) {
    if (child.type === "tag" && (child.name === "p" || child.name === "div")) {
      content.push(paragraphFromInline(processInline(child, [])));
    } else if (child.type === "tag" && (child.name === "ul" || child.name === "ol")) {
      content.push(...processBlockNodes([child]));
    } else if (child.type === "text" && (child.data ?? "").trim()) {
      content.push(paragraphFromInline(processInline(child, [])));
    } else if (child.type === "tag") {
      const inline = processInline(child, []);
      if (inline.length) content.push(paragraphFromInline(inline));
    }
  }

  if (content.length === 0) {
    content.push({ type: "paragraph", content: [] });
  }

  return { type: "listItem", content };
}

function processBlockNodes(nodes: DomNode[]): AdfNode[] {
  const content: AdfNode[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      if ((node.data ?? "").trim()) {
        content.push(paragraphFromInline(processInline(node, [])));
      }
      continue;
    }

    if (node.type !== "tag") continue;
    const name = (node.name ?? "").toLowerCase();

    if (name === "p" || name === "div") {
      content.push(paragraphFromInline(processInline(node, [])));
    } else if (/^h[1-6]$/.test(name)) {
      content.push({
        type: "heading",
        attrs: { level: Number(name.slice(1)) },
        content: processInline(node, []),
      });
    } else if (name === "ul" || name === "ol") {
      const items = (node.children ?? [])
        .filter((c) => c.type === "tag" && c.name?.toLowerCase() === "li")
        .map(processListItem);
      content.push({
        type: name === "ul" ? "bulletList" : "orderedList",
        content: items,
      });
    } else if (name === "blockquote") {
      content.push({
        type: "blockquote",
        content: processBlockNodes(node.children ?? []),
      });
    } else if (name === "pre") {
      const codeChild = (node.children ?? []).find(
        (c) => c.type === "tag" && c.name?.toLowerCase() === "code",
      );
      const textNodes = processInline(codeChild ?? node, [])
        .filter((n) => n.type === "text")
        .map((n) => ({ type: "text" as const, text: n.text ?? "" }));
      const languageClass = codeChild?.attribs?.class ?? node.attribs?.class ?? "";
      const langMatch = languageClass.match(/language-([a-z0-9_+-]+)/i);
      content.push({
        type: "codeBlock",
        attrs: langMatch ? { language: langMatch[1] } : {},
        content: textNodes,
      });
    } else if (name === "hr") {
      content.push({ type: "rule" });
    } else if (name === "table" || name === "tbody" || name === "thead" || name === "tr") {
      content.push(...processBlockNodes(node.children ?? []));
    } else if (name === "td" || name === "th") {
      content.push(paragraphFromInline(processInline(node, [])));
    } else {
      content.push(...processBlockNodes(node.children ?? []));
    }
  }

  return content;
}

/**
 * Convert TipTap (and similar) HTML to Jira ADF, including marks that
 * `@razroo/html-to-adf` drops (e.g. `strong`, `s`, `textColor` spans).
 */
export function htmlToAdf(html: string): AdfNode {
  const trimmed = html.trim();
  if (!trimmed) {
    return { type: "doc", version: 1, content: [] };
  }

  const nodes = parse(trimmed) as DomNode[];
  return {
    type: "doc",
    version: 1,
    content: processBlockNodes(nodes),
  };
}
