// @generated — do not edit. Re-generate with: npx nx run wrike:generate-mappings
// Source: capabilities/wrike.api.yaml → entities.tasks
// Resolution maps (statusMap, contactMap) must be pre-fetched
// by the adapter and passed in — the generator cannot produce these API calls.

import type { PlatformTask } from "@mp/task-core";

import type { WrikeContact, WrikeCustomStatus, WrikeTask } from "@/types/wrike";

export function normalizeTask(
  raw: WrikeTask,
  /** From GET /workflows — flatten customStatuses into a Map<id, WrikeCustomStatus> */
  statusMap: Map<string, WrikeCustomStatus>,
  /** From GET /contacts — Map<contactId, WrikeContact> */
  contactMap: Map<string, WrikeContact>,
): PlatformTask {
  return {
    id: raw.id,
    key: raw.id,
    fields: {
      issuetype: { id: "task", name: "Task" },
      summary: raw.title ?? "",
      status: (() => {
        const customStatus = raw.customStatusId ? statusMap.get(raw.customStatusId) : undefined;
        if (customStatus) {
          const standardName = customStatus.standardName;
          const statusCategory =
            standardName === "Completed"
              ? { key: "done", name: "Done" }
              : standardName === "Active"
                ? { key: "indeterminate", name: "In Progress" }
                : { key: "undefined", name: standardName };
          return { id: customStatus.id, name: customStatus.name, statusCategory };
        }
        return {
          id: raw.customStatusId ?? "unknown",
          name: raw.customStatusId ?? "Unknown",
          statusCategory: { key: "undefined", name: "Unknown" },
        };
      })(),
      priority: raw.importance ? { id: raw.importance, name: raw.importance } : undefined,
      assignee: (() => {
        const id = raw.responsibleIds?.[0];
        const contact = id ? contactMap.get(id) : undefined;
        if (!contact) return undefined;
        return {
          accountId: contact.id,
          displayName: `${contact.firstName} ${contact.lastName}`.trim(),
          avatarUrls: contact.avatarUrl ? { "48x48": contact.avatarUrl } : undefined,
        };
      })(),
      reporter: (() => {
        const id = raw.authorIds?.[0];
        const contact = id ? contactMap.get(id) : undefined;
        if (!contact) return undefined;
        return {
          accountId: contact.id,
          displayName: `${contact.firstName} ${contact.lastName}`.trim(),
          avatarUrls: contact.avatarUrl ? { "48x48": contact.avatarUrl } : undefined,
        };
      })(),
      description: raw.description ?? undefined,
      duedate: raw.dates?.due ?? undefined,
      subtasks: raw.subTaskIds?.map((id) => ({
        id,
        key: id,
        fields: {
          summary: "",
          status: { id: "", name: "", statusCategory: { key: "undefined", name: "Unknown" } },
          issuetype: { id: "task", name: "Task" },
        },
      })),
      parent: raw.superTaskIds?.[0]
        ? { id: raw.superTaskIds[0], key: raw.superTaskIds[0], summary: "" }
        : undefined,
      attachment: raw.hasAttachments ? [{ id: "attachments", filename: "Attachments" }] : undefined,
    },
  };
}
