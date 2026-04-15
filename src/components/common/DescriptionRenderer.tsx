"use client";

import type { PlatformType } from "@/types/platform-entities";

import { type ADFNode, AdfRenderer } from "./AdfRenderer";

interface DescriptionRendererProps {
  /** For Jira this is an ADF object; for Wrike it is an HTML string. */
  description: unknown;
  platform: PlatformType;
  attachments?: Array<{ id: string; filename: string }>;
}

export function DescriptionRenderer({
  description,
  platform,
  attachments,
}: DescriptionRendererProps) {
  if (!description) return null;

  if (platform === "jira" && typeof description === "object") {
    return <AdfRenderer document={description as ADFNode} attachments={attachments} />;
  }

  if (typeof description === "string") {
    return (
      <div
        className="prose prose-sm max-w-none text-sm"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    );
  }

  return null;
}
