import React, { JSX } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

export interface ADFMark {
  type: string;
  attrs?: Record<string, string | number | boolean>;
}

export interface ADFNode {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean>;
  marks?: ADFMark[];
  content?: ADFNode[];
}

interface Props {
  document: ADFNode;
  attachments?: Array<{ id: string; filename: string }>;
  components?: Partial<NodeComponentMap>;
}

type NodeRenderer = (
  node: ADFNode,
  children: React.ReactNode,
) => React.ReactNode;

interface NodeComponentMap {
  paragraph: NodeRenderer;
  heading: NodeRenderer;
  bulletList: NodeRenderer;
  orderedList: NodeRenderer;
  listItem: NodeRenderer;
  codeBlock: NodeRenderer;
  blockquote: NodeRenderer;
  panel: NodeRenderer;
}

export const AdfRenderer: React.FC<Props> = ({
  document,
  attachments,
  components = {},
}) => {
  const renderNode = (node: ADFNode, key?: number): React.ReactNode => {
    if (!node) return null;

    // TEXT NODE
    if (node.type === "text") {
      let content: React.ReactNode = node.text;

      if (node.marks) {
        node.marks.forEach((mark) => {
          switch (mark.type) {
            case "strong":
              content = <strong key={mark.type}>{content}</strong>;
              break;
            case "em":
              content = <em key={mark.type}>{content}</em>;
              break;
            case "strike":
              content = <s key={mark.type}>{content}</s>;
              break;
            case "underline":
              content = (
                <span className="underline" key={mark.type}>
                  {content}
                </span>
              );
              break;
            case "subsup":
              const Tag = `${mark.attrs?.type}` as keyof JSX.IntrinsicElements;
              content = <Tag key={mark.type}>{content}</Tag>;
              break;
            case "code":
              content = <code key={mark.type}>{content}</code>;
              break;
            case "link":
              content = (
                <a
                  key={mark.type}
                  href={mark.attrs?.href as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                >
                  {content}
                </a>
              );
              break;
            case "textColor":
              content = (
                <span style={{ color: mark.attrs?.color as string }}>
                  {content}
                </span>
              );
              break;
          }
        });
      }

      return content;
    }

    const children = node.content?.map((child, i) => (
      <React.Fragment key={i}>{renderNode(child, i)}</React.Fragment>
    ));

    const custom = components[node.type as keyof NodeComponentMap];

    if (custom) {
      return (
        <React.Fragment key={key}>{custom(node, children)}</React.Fragment>
      );
    }

    switch (node.type) {
      case "doc":
        return <>{children}</>;

      case "mediaSingle":
        return <>{children}</>;

      case "mediaGroup":
        return <div className="grid grid-cols-3 gap-2">{children}</div>;

      case "paragraph":
        return <p key={key}>{children}</p>;
      case "heading":
        const level = (node.attrs?.level ?? 1) as number;
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;

        // Map heading levels to Tailwind classes
        const headingClasses: Record<number, string> = {
          1: "text-2xl font-bold mt-[1em]",
          2: "text-xl font-semibold mt-[1em]",
          3: "text-lg font-semibold mt-[1em]",
          4: "text-base font-medium mt-[1em]",
          5: "text-sm font-medium mt-[1em]",
          6: "text-xs font-medium mt-[1em]",
        };

        const className = headingClasses[level] || "text-xl font-bold";

        return (
          <Tag key={key} className={className}>
            {children}
          </Tag>
        );
      case "bulletList":
        return (
          <ul key={key} className="list-[unset] pl-4">
            {children}
          </ul>
        );

      case "orderedList":
        return (
          <ol key={key} className="list-[unset] pl-4">
            {children}
          </ol>
        );

      case "listItem":
        return <li key={key}>{children}</li>;

      case "codeBlock":
        return (
          <pre key={key} className="px-2 py-1 rounded bg-muted">
            <code>{children}</code>
          </pre>
        );

      case "blockquote":
        return (
          <blockquote key={key} className="border-l border-primary pl-4 italic">
            {children}
          </blockquote>
        );
      case "panel":
        const panelType = (node.attrs?.panelType ?? "info") as string;
        const panelToAlertVariant: Record<
          string,
          | "warning"
          | "success"
          | "primary"
          | "danger"
          | "default"
          | null
          | undefined
        > = {
          info: "default",
          note: "primary",
          warning: "warning",
          error: "danger",
          success: "success",
        };
        return (
          <Alert key={key} variant={panelToAlertVariant[panelType]}>
            <AlertDescription className="text-sm">{children}</AlertDescription>
          </Alert>
        );

      case "hardBreak":
        return <br key={key} />;

      case "inlineCard":
        const url = node.attrs?.url;
        if (!url) return null;

        // Truncate URL to a sensible length
        const truncateUrl = (url: string, maxLength = 40) => {
          if (url.length <= maxLength) return url;
          const start = url.slice(0, maxLength / 2);
          const end = url.slice(-maxLength / 2 + 3);
          return `${start}…${end}`;
        };

        return (
          <a
            key={key}
            href={url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 p-0.5 rounded bg-primary-50 border border-primary-200 text-sm no-underline font-medium"
            title={url as string}
          >
            🔗 {truncateUrl(url as string)}
          </a>
        );

      case "date":
        const timestamp = Number(node.attrs?.timestamp);
        const date = timestamp
          ? new Date(timestamp).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "Invalid date";

        return (
          <time
            key={key}
            dateTime={timestamp ? new Date(timestamp).toISOString() : undefined}
            className="bg-gray-100 text-gray-800 px-1 rounded"
          >
            {date}
          </time>
        );

      case "emoji":
        const emoji = node.attrs?.text || "❓";
        return (
          <span key={key} className="inline-block">
            {emoji}
          </span>
        );

      case "status":
        const statusText = node.attrs?.text ?? "Unknown";
        const statusColor = (node.attrs?.color ?? "gray") as string;
        const statusBgMap: Record<string, string> = {
          neutral: "bg-gray-100 text-gray-800",
          blue: "bg-blue-100 text-blue-800",
          green: "bg-green-100 text-green-800",
          yellow: "bg-yellow-100 text-yellow-800",
          red: "bg-red-100 text-red-800",
          purple: "bg-purple-100 text-purple-800",
        };
        return (
          <span
            key={key}
            className={`inline-block px-2 py-0.5 rounded-full font-medium text-xs ${statusBgMap[statusColor] || "bg-gray-100 text-gray-800"}`}
          >
            {statusText}
          </span>
        );

      case "mention":
        const mentionText = node.attrs?.text ?? "Unknown";
        return (
          <span
            key={key}
            className="text-primary font-medium"
            title={node.attrs?.id as string}
          >
            {mentionText}
          </span>
        );

      case "rule":
        return <Separator />;

      case "expand":
        const title = (node.attrs?.title || "Details") as string;
        const localId = (node.attrs?.localId || "id") as string;

        return (
          <Accordion type="single" collapsible key={localId || title}>
            <AccordionItem value={localId || title}>
              <AccordionTrigger className="py-2 font-medium rounded">
                {title}
              </AccordionTrigger>
              <AccordionContent>{children}</AccordionContent>
            </AccordionItem>
          </Accordion>
        );

      case "table":
        return (
          <div key={key} className="overflow-x-auto my-4">
            <table className="table-auto border border-gray-300 w-full">
              <tbody>{children}</tbody>
            </table>
          </div>
        );

      case "tableRow":
        return <tr key={key}>{children}</tr>;

      case "tableHeader":
        return (
          <th
            key={key}
            className="border border-gray-300 px-2 py-1 align-top text-left bg-muted font-medium"
          >
            {children}
          </th>
        );
      case "tableCell":
        return (
          <td key={key} className="border border-gray-300 px-2 py-1 align-top">
            {children}
          </td>
        );

      case "media":
        const attachmentEndpointBaseUrl = "/api/jira/attachment/";
        const filename = node.attrs?.alt as string;

        const attachment = attachments?.find(
          (a) => a.filename === filename || filename?.includes(a.filename),
        );

        if (!attachment) return null;

        return (
          <a
            key={key}
            href={`${attachmentEndpointBaseUrl}${attachment.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Image
              src={`${attachmentEndpointBaseUrl}${attachment.id}?thumbnail=true`}
              alt={filename}
              className="rounded border"
              width={(node.attrs?.width as number) || 300}
              height={(node.attrs?.height as number) || 300}
              unoptimized
            />
          </a>
        );

      default:
        return null;
    }
  };

  return <div className="text-sm space-y-2">{renderNode(document)}</div>;
};
