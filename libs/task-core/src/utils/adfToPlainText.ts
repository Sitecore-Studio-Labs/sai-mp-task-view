function walk(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  const n = node as { type?: string; text?: string; content?: unknown[] };

  if (n.type === "text" && typeof n.text === "string") {
    out.push(n.text);
  }

  if (Array.isArray(n.content)) {
    for (const child of n.content) walk(child, out);
    if (n.type === "paragraph" || n.type === "heading" || n.type === "listItem") {
      out.push("\n");
    }
  }
}

/**
 * Best-effort conversion from Jira ADF (Atlassian Document Format) to plain text.
 * Used to prefill edit forms without losing the ability to preserve the original ADF when unchanged.
 */
export function adfToPlainText(adf: unknown): string {
  if (!adf) return "";
  const out: string[] = [];
  walk(adf, out);
  return out
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
