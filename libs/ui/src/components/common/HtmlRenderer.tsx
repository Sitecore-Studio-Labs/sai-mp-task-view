"use client";

/**
 * Renders an HTML string as styled rich text.
 *
 * Use this for platforms where `richTextFormat === "html"` (e.g. Wrike).
 * The arbitrary-variant selectors restore list styling that Tailwind's
 * preflight resets, so bullet/numbered lists render correctly without
 * requiring the @tailwindcss/typography plugin.
 *
 * Mirrors the AdfRenderer pattern: one component, used everywhere HTML
 * content is displayed (TaskDetails, CommentCard, etc.), so styling
 * stays consistent and is maintained in one place.
 */

interface HtmlRendererProps {
  html: string;
  className?: string;
}

export function HtmlRenderer({ html, className }: HtmlRendererProps) {
  return (
    <div
      className={[
        "text-sm",
        "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5",
        "[&_p]:my-0.5",
        "[&_strong]:font-semibold",
        "[&_em]:italic",
        "[&_a]:text-primary [&_a]:underline",
        "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono",
        "[&_pre]:bg-muted [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:font-mono",
        "[&_blockquote]:border-primary [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
