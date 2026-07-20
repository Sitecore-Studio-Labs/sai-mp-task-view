import type { DOMNode } from "html-react-parser";
import { Element, Text as HtmlText } from "html-react-parser";
const CODE_BLOCK_PLACEHOLDER = "CODE_BLOCK_PLACEHOLDER_";

/** TipTap uses literal newlines; Wrike persists line breaks as <br> inside <pre><code>. */
function protectCodeBlocks(html: string): { html: string; blocks: string[] } {
  const blocks: string[] = [];
  const protectedHtml = html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
    const id = blocks.length;
    blocks.push(match);
    return `<!--${CODE_BLOCK_PLACEHOLDER}${id}-->`;
  });
  return { html: protectedHtml, blocks };
}

function restoreCodeBlocks(html: string, blocks: string[]): string {
  return blocks.reduce(
    (result, block, id) => result.replace(`<!--${CODE_BLOCK_PLACEHOLDER}${id}-->`, block),
    html,
  );
}

/** Serialize pre/code DOM nodes, turning <br> and block wrappers into newlines. */
export function serializePreContent(nodes: DOMNode[]): string {
  let result = "";
  for (const node of nodes) {
    if (node instanceof HtmlText) {
      result += node.data;
      continue;
    }
    if (!(node instanceof Element)) continue;

    if (node.name === "br") {
      result += "\n";
      continue;
    }
    if (node.name === "p" || node.name === "div") {
      if (result && !result.endsWith("\n")) result += "\n";
      result += serializePreContent(node.children as DOMNode[]);
      if (!result.endsWith("\n")) result += "\n";
      continue;
    }
    result += serializePreContent(node.children as DOMNode[]);
  }
  return result;
}

/** Convert <br> / block wrappers inside a single <pre> to literal newlines. */
function normalizePreBlockHtml(preHtml: string): string {
  if (typeof document === "undefined") {
    return preHtml.replace(/<br\s*\/?>/gi, "\n");
  }

  const doc = new DOMParser().parseFromString(`<body>${preHtml}</body>`, "text/html");
  const pre = doc.body.querySelector("pre");
  if (!pre) return preHtml;

  pre.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));

  pre.querySelectorAll("p, div").forEach((block) => {
    if (block.parentElement?.closest("pre") !== pre) return;
    const text = block.textContent ?? "";
    block.replaceWith(doc.createTextNode(text.endsWith("\n") ? text : `${text}\n`));
  });

  return pre.outerHTML;
}

/** Convert <br> / block wrappers inside <pre> to literal newlines for editors that expect them. */
export function normalizeCodeBlocksInHtml(html: string): string {
  if (!html.includes("<pre")) return html;

  return html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, normalizePreBlockHtml);
}

/** Convert literal newlines inside <pre> to <br> for Wrike API persistence. */
export function normalizeCodeBlocksForWrikeExport(html: string): string {
  if (!html.includes("<pre")) return html;

  return html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (preHtml) => preHtml.replace(/\n/g, "<br>"));
}

/** Protect code blocks while mutating surrounding HTML (DOM round-trips collapse newlines). */
export function withProtectedCodeBlocks(html: string, mutate: (html: string) => string): string {
  if (!html.includes("<pre")) return mutate(html);
  const { html: protectedHtml, blocks } = protectCodeBlocks(html);
  return restoreCodeBlocks(mutate(protectedHtml), blocks);
}
