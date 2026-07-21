type AdfMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

type AdfNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
  content?: AdfNode[];
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function renderMarks(text: string, marks: AdfMark[] | undefined): string {
  if (!marks?.length) return text;

  return marks.reduce((html, mark) => {
    switch (mark.type) {
      case "strong":
        // Use <b>/<del> — TipTap accepts them, and @razroo/html-to-adf only maps these tags.
        return `<b>${html}</b>`;
      case "em":
        return `<em>${html}</em>`;
      case "strike":
        return `<del>${html}</del>`;
      case "underline":
        return `<u>${html}</u>`;
      case "code":
        return `<code>${html}</code>`;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
        if (!href) return html;
        return `<a href="${escapeAttr(href)}">${html}</a>`;
      }
      case "textColor": {
        const color = typeof mark.attrs?.color === "string" ? mark.attrs.color : "";
        if (!color) return html;
        return `<span style="color: ${escapeAttr(color)}">${html}</span>`;
      }
      case "subsup": {
        const tag = mark.attrs?.type === "sub" ? "sub" : mark.attrs?.type === "sup" ? "sup" : null;
        return tag ? `<${tag}>${html}</${tag}>` : html;
      }
      default:
        return html;
    }
  }, text);
}

function renderChildren(nodes: AdfNode[] | undefined): string {
  if (!nodes?.length) return "";
  return nodes.map(renderNode).join("");
}

function renderNode(node: AdfNode | undefined): string {
  if (!node || typeof node !== "object") return "";

  if (node.type === "text") {
    return renderMarks(escapeHtml(node.text ?? ""), node.marks);
  }

  const children = renderChildren(node.content);

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
      return `<h${level}>${children}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "taskList":
      return `<ul data-type="taskList">${children}</ul>`;
    case "taskItem": {
      const checked = node.attrs?.state === "DONE";
      return `<li data-type="taskItem" data-checked="${checked ? "true" : "false"}">${children}</li>`;
    }
    case "codeBlock": {
      const language =
        typeof node.attrs?.language === "string" && node.attrs.language
          ? ` class="language-${escapeAttr(node.attrs.language)}"`
          : "";
      return `<pre><code${language}>${children}</code></pre>`;
    }
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "hardBreak":
      return "<br>";
    case "rule":
      return "<hr>";
    case "table":
      return `<table><tbody>${children}</tbody></table>`;
    case "tableRow":
      return `<tr>${children}</tr>`;
    case "tableHeader":
      return `<th>${children}</th>`;
    case "tableCell":
      return `<td>${children}</td>`;
    case "emoji":
      return escapeHtml(typeof node.attrs?.text === "string" ? node.attrs.text : "");
    case "mention":
      return escapeHtml(typeof node.attrs?.text === "string" ? node.attrs.text : "");
    case "inlineCard": {
      const url = typeof node.attrs?.url === "string" ? node.attrs.url : "";
      if (!url) return "";
      return `<a href="${escapeAttr(url)}">${escapeHtml(url)}</a>`;
    }
    case "mediaSingle":
    case "mediaGroup":
    case "panel":
    case "expand":
      return children;
    default:
      return children;
  }
}

/**
 * Convert Jira ADF (Atlassian Document Format) to HTML for TipTap edit prefill.
 * Round-trips through convertHtmlToADF on save when the description changes.
 */
export function adfToHtml(adf: unknown): string {
  if (!adf) return "";
  if (typeof adf === "string") return adf;
  return renderNode(adf as AdfNode).trim();
}
