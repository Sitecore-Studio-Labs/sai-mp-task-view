/** Jira-style permission keys used by shared UI components. */
export const WRIKE_PERMISSION_KEYS = [
  "BROWSE_PROJECTS",
  "CREATE_ISSUES",
  "EDIT_ISSUES",
  "DELETE_ISSUES",
  "ASSIGN_ISSUES",
  "TRANSITION_ISSUES",
] as const;

export type WrikePermissionKey = (typeof WRIKE_PERMISSION_KEYS)[number];

export const WRIKE_ACCESS_ROLE_FULL = "Full";

const ROLE_PERMISSIONS: Record<string, ReadonlySet<WrikePermissionKey>> = {
  full: new Set(WRIKE_PERMISSION_KEYS),
  editor: new Set([
    "BROWSE_PROJECTS",
    "CREATE_ISSUES",
    "EDIT_ISSUES",
    "ASSIGN_ISSUES",
    "TRANSITION_ISSUES",
  ]),
  limited: new Set(["BROWSE_PROJECTS", "CREATE_ISSUES", "EDIT_ISSUES", "TRANSITION_ISSUES"]),
  "read only": new Set(["BROWSE_PROJECTS"]),
};

function normalizeRoleTitle(roleTitle: string): string {
  return roleTitle.trim().toLowerCase();
}

/** Maps a Wrike space access-role title (or Full when isManager) to a Jira-style permission. */
export function hasWrikePermission(roleTitle: string, permission: string): boolean {
  const allowed = ROLE_PERMISSIONS[normalizeRoleTitle(roleTitle)];
  if (!allowed) return false;
  return allowed.has(permission as WrikePermissionKey);
}

/**
 * When space membership cannot be resolved (nested folder outside a space map,
 * folder-only share, or Wrike blocks space/role APIs), grant Editor-like rights.
 * DELETE stays denied — that requires an explicit Full role.
 */
export function hasWrikeFolderAccessFallback(permission: string): boolean {
  return hasWrikePermission("Editor", permission);
}
