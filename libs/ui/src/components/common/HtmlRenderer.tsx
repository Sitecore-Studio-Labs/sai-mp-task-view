"use client";

import parse, { type DOMNode, domToReact, Element } from "html-react-parser";
import type { JSX } from "react";

/**
 * Tags that are allowed to render. Everything else has its tag stripped
 * while its text children are preserved, so unknown/dangerous elements
 * (script, iframe, object, …) can never execute or embed remote content.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "u",
  "span",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "code",
  "pre",
  "blockquote",
  "img",
]);

function replace(node: DOMNode): JSX.Element | string | null | void {
  if (!(node instanceof Element)) return;

  const children = domToReact(node.children as DOMNode[], { replace });

  if (!ALLOWED_TAGS.has(node.name)) {
    // Strip the tag but keep text children so no content is lost.
    return <>{children}</>;
  }

  switch (node.name) {
    case "ul":
      return <ul className="my-1 list-disc pl-5">{children}</ul>;
    case "ol":
      return <ol className="my-1 list-decimal pl-5">{children}</ol>;
    case "li":
      return <li className="my-0.5">{children}</li>;
    case "p":
      return <p className="my-0.5">{children}</p>;
    case "br":
      return <br />;
    case "strong":
    case "b":
      return <strong className="font-bold">{children}</strong>;
    case "em":
    case "i":
      return <em className="italic">{children}</em>;
    case "s":
      return <s>{children}</s>;
    case "u":
      return <u>{children}</u>;
    case "span": {
      // Preserve only the safe inline style properties produced by the rich-text editor.
      const rawStyle = node.attribs?.style ?? "";
      const style: React.CSSProperties = {};
      const colorMatch = rawStyle.match(/(?<![a-z-])color:\s*([^;]+)/i);
      if (colorMatch) style.color = colorMatch[1].trim();
      const bgMatch = rawStyle.match(/background-color:\s*([^;]+)/i);
      if (bgMatch) style.backgroundColor = bgMatch[1].trim();
      return Object.keys(style).length > 0 ? (
        <span style={style}>{children}</span>
      ) : (
        <span>{children}</span>
      );
    }
    case "a": {
      const href = node.attribs?.href ?? "#";
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {children}
        </a>
      );
    }
    case "code":
      return <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">{children}</code>;
    case "pre":
      return (
        <pre className="bg-muted my-2 overflow-x-auto rounded-md p-3 font-mono text-xs">
          {children}
        </pre>
      );
    case "blockquote":
      return <blockquote className="border-primary border-l-2 pl-3 italic">{children}</blockquote>;
    case "h1":
      return <h1 className="mt-[1em] text-2xl font-bold">{children}</h1>;
    case "h2":
      return <h2 className="mt-[1em] text-xl font-semibold">{children}</h2>;
    case "h3":
      return <h3 className="mt-[1em] text-lg font-semibold">{children}</h3>;
    case "h4":
      return <h4 className="mt-[1em] text-base font-medium">{children}</h4>;
    case "h5":
      return <h5 className="mt-[1em] text-sm font-medium">{children}</h5>;
    case "h6":
      return <h6 className="mt-[1em] text-xs font-medium">{children}</h6>;
    case "img": {
      const src = node.attribs?.src ?? "";
      const alt = node.attribs?.alt ?? "";
      if (!src) return null;
      return <img src={src} alt={alt} className="my-2 max-w-full rounded border" />;
    }
  }
}

interface HtmlRendererProps {
  html: string;
  className?: string;
}

/**
 * Safely renders an HTML string as styled React elements.
 *
 * Uses html-react-parser so the HTML is never injected raw into the DOM.
 * An element allowlist strips any tag not explicitly handled (script,
 * iframe, img, object, …) while preserving their text children.
 * Each allowed tag is rendered as a React element with Tailwind classes —
 * matching the AdfRenderer pattern used for Jira.
 */
export function HtmlRenderer({ html, className }: HtmlRendererProps) {
  return (
    <div className={["text-sm", className].filter(Boolean).join(" ")}>
      {parse(html, { replace })}
    </div>
  );
}
