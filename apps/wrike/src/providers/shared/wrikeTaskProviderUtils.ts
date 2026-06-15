import type { AssigneeOption, PlatformUser } from "@mp/task-core";

/** Normalizes platform users or adapter-mapped {@link AssigneeOption} rows. */
export function mapWrikeUserToAssignee(u: PlatformUser | AssigneeOption): AssigneeOption {
  const id = ("accountId" in u && u.accountId) || ("id" in u && u.id) || "";
  const avatarUrl =
    ("avatarUrl" in u && u.avatarUrl) ||
    ("avatarUrls" in u && u.avatarUrls?.["48x48"]) ||
    ("avatarUrls" in u && u.avatarUrls?.["24x24"]) ||
    undefined;

  return {
    id,
    displayName: u.displayName ?? "",
    avatarUrl,
  };
}
