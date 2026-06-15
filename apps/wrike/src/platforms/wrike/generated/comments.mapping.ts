// @generated — do not edit. Re-generate with: npx nx run wrike:generate-mappings
// Source: capabilities/wrike.api.yaml → entities.comments
// Resolution maps (contactMap) must be pre-fetched
// by the adapter and passed in — the generator cannot produce these API calls.

import type { PlatformComment } from "@mp/task-core";

import type { WrikeComment, WrikeContact } from "@/types/wrike";

export function normalizeComment(
  raw: WrikeComment,
  /** From GET /contacts — Map<contactId, WrikeContact> */
  contactMap: Map<string, WrikeContact>,
): PlatformComment {
  return {
    id: raw.id,
    author: (() => {
      const contact = raw.authorId ? contactMap.get(raw.authorId) : undefined;
      return contact
        ? {
            accountId: contact.id,
            displayName: `${contact.firstName} ${contact.lastName}`.trim(),
            avatarUrls: contact.avatarUrl ? { "48x48": contact.avatarUrl } : undefined,
          }
        : { accountId: raw.authorId ?? "", displayName: raw.authorId ?? "Unknown" };
    })(),
    body: raw.text,
    created: raw.createdDate ?? "",
    updated: raw.updatedDate ?? raw.createdDate ?? "",
  };
}
