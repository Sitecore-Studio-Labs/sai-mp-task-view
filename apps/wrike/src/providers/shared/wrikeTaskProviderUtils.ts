import type { AssigneeOption } from "@mp/task-core";

/**
 * Maps platform user rows (REST or already-normalized) to {@link AssigneeOption}
 * for create/edit task forms. Extend when your platform user shape is finalized.
 */
export function mapWrikeUserToAssignee(
  u: AssigneeOption | Record<string, unknown>,
): AssigneeOption {
  if (
    typeof u === "object" &&
    u !== null &&
    "id" in u &&
    "displayName" in u &&
    typeof (u as AssigneeOption).id === "string"
  ) {
    return u as AssigneeOption;
  }

  const rec = u as Record<string, unknown>;
  const avatarUrl =
    typeof rec.avatarUrl === "string"
      ? rec.avatarUrl
      : typeof rec.avatarUrls === "object" &&
          rec.avatarUrls !== null &&
          typeof (rec.avatarUrls as Record<string, string>)["24x24"] === "string"
        ? (rec.avatarUrls as Record<string, string>)["24x24"]
        : undefined;

  return {
    id: String(rec.id ?? rec.accountId ?? ""),
    displayName: String(rec.displayName ?? rec.name ?? ""),
    avatarUrl,
  };
}
