import { aiOutputSchema } from "@/schemas/workbreakdown-schema";

import { validateAndNormalize } from "./workbreakdown-normalize";

const VALID_TYPES = ["epic", "story", "task", "subtask"] as const;

type RawItem = {
  type?: string;
  title?: string;
  name?: string;
  description?: string;
  children?: unknown[];
  metadata?: unknown;
  id?: string;
  [key: string]: unknown;
};

/** Keys LLMs often use for nested items; we normalize all to "children". */
const CHILD_KEYS = ["children", "tasks", "subtasks", "stories", "items"] as const;

function getRawChildren(item: RawItem): unknown[] {
  for (const key of CHILD_KEYS) {
    const val = item[key];
    if (Array.isArray(val)) return val;
  }
  return [];
}

/** Normalize a single item: coerce type/title/description and pull nested items from any common key. */
function normalizeRawItem(item: RawItem): RawItem {
  const rawType = (item.type ?? "task").toString().toLowerCase();
  const type = VALID_TYPES.includes(rawType as (typeof VALID_TYPES)[number]) ? rawType : "task";
  const title =
    typeof item.title === "string" && item.title.trim()
      ? item.title.trim()
      : typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : "Untitled";
  const description = typeof item.description === "string" ? item.description : "";
  const rawChildren = getRawChildren(item);
  const children = rawChildren.map((c) =>
    normalizeRawItem(c as Record<string, unknown> as RawItem),
  );
  return {
    ...item,
    type,
    title,
    description,
    children,
  };
}

/** Top-level keys that might hold the root array of work items. */
const ROOT_KEYS = ["items", "stories", "epics", "tasks", "workItems"] as const;

function getRootItems(parsed: unknown): RawItem[] {
  if (Array.isArray(parsed)) {
    return parsed.map((p) => normalizeRawItem(p as RawItem));
  }
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed as Record<string, unknown>;
  for (const key of ROOT_KEYS) {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0) {
      return val.map((p) => normalizeRawItem(p as RawItem));
    }
  }
  // Single epic/story at root: { epic: {...} } or { story: {...} }
  for (const key of ["epic", "story"]) {
    const val = obj[key];
    if (val && typeof val === "object") {
      return [normalizeRawItem(val as RawItem)];
    }
  }
  return [];
}

/** Ensure parsed AI output has items array; accept items, stories, epics, tasks, or single epic/story. */
function normalizeAiOutput(parsed: unknown): { items: RawItem[] } {
  const items = getRootItems(parsed);
  return { items };
}

/** Extract JSON from AI response (handle markdown code blocks). */
export function extractJsonFromResponse(text: string): unknown {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}

/**
 * Parse and validate AI output into a normalized work breakdown.
 * Normalizes type (lowercase), title (fallback to name or "Untitled"), and description before validation.
 * Throws on invalid JSON or schema validation failure.
 */
export function parseAiWorkBreakdown(
  rawResponse: string,
  draftId: string,
  projectKey?: string,
  platform?: string,
) {
  const parsed = extractJsonFromResponse(rawResponse);
  const normalized = normalizeAiOutput(parsed);
  if (normalized.items.length === 0) {
    throw new Error("AI returned no work items.");
  }
  const validated = aiOutputSchema.parse(normalized as unknown);
  return validateAndNormalize(
    validated as Parameters<typeof validateAndNormalize>[0],
    draftId,
    projectKey,
    platform,
  );
}
