// @generated — do not edit. Re-generate with: npx nx run wrike:generate-mappings
// Empty resolution maps and normalizer wrappers until the service adapter loads real data.

import type { WrikeComment, WrikeContact, WrikeCustomStatus, WrikeTask } from "@/types/wrike";

import { normalizeComment } from "./comments.mapping";
import { normalizeTask } from "./tasks.mapping";

export const EMPTY_CONTACT_MAP = new Map<string, WrikeContact>();
export const EMPTY_STATUS_MAP = new Map<string, WrikeCustomStatus>();

export function normalizeTaskWithEmptyMaps(raw: WrikeTask) {
  return normalizeTask(raw, EMPTY_STATUS_MAP, EMPTY_CONTACT_MAP);
}

export function normalizeCommentWithEmptyMaps(raw: WrikeComment) {
  return normalizeComment(raw, EMPTY_CONTACT_MAP);
}
