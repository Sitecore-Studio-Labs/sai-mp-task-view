import type { WorkBreakdown, WorkItem } from "@mp/ai";

/** Generate a stable temp id for items that don't have one. */
function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Raw item shape as from AI (id and children may be missing or partial). */
export interface RawWorkItem {
  id?: string;
  type: "epic" | "story" | "task" | "subtask";
  title: string;
  description: string;
  children?: RawWorkItem[];
  metadata?: Record<string, unknown>;
}

/**
 * Normalize AI output: assign temp ids to items that don't have one, ensure children arrays.
 * Returns a full WorkBreakdown (with id, status, timestamps) when given items + optional context.
 */
export function normalizeWorkBreakdown(
  rawItems: RawWorkItem[],
  options: {
    draftId: string;
    projectKey?: string;
    platform?: string;
  },
): WorkBreakdown {
  const now = new Date().toISOString();

  function normalizeItem(raw: RawWorkItem): WorkItem {
    const children = (raw.children ?? []).map(normalizeItem);
    return {
      id: raw.id ?? nextId("wb"),
      type: raw.type,
      title: raw.title?.trim() || "Untitled",
      description: typeof raw.description === "string" ? raw.description : "",
      children,
      metadata: raw.metadata,
    };
  }

  const items = rawItems.map(normalizeItem);

  return {
    id: options.draftId,
    projectKey: options.projectKey,
    platform: options.platform,
    status: "draft",
    items,
    createdAt: now,
    updatedAt: now,
  };
}

/** Validate and normalize: parse result must have at least one item. */
export function validateAndNormalize(
  parsed: { items?: RawWorkItem[] },
  draftId: string,
  projectKey?: string,
  platform?: string,
): WorkBreakdown {
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  if (items.length === 0) {
    throw new Error("AI output must contain at least one top-level item.");
  }
  return normalizeWorkBreakdown(items, { draftId, projectKey, platform });
}
