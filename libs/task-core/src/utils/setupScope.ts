import type { PlatformSetupRecord, UpsertPlatformSetupPayload } from "../types/platform-setup";
import type {
  PlatformScopeSelection,
  PlatformSetupScopeConfig,
  SetupScopeLevel,
} from "../types/setup-scope";

const JIRA_SITE_LEVEL = "site";
const JIRA_PROJECT_LEVEL = "project";

/** Leaf scope level that gates the task list (Jira project, Wrike folder, Monday board). */
export function getTaskListScopeLevel(setupScope: PlatformSetupScopeConfig): SetupScopeLevel {
  const level = setupScope.scopeLevels.find((item) => item.id === setupScope.taskListScopeLevelId);
  if (!level) {
    throw new Error(
      `taskListScopeLevelId "${setupScope.taskListScopeLevelId}" is not defined in scopeLevels.`,
    );
  }
  return level;
}

/** Ancestor scope levels above the task-list leaf (e.g. Jira site; empty for Wrike/Monday). */
export function getTenantScopeLevels(setupScope: PlatformSetupScopeConfig): SetupScopeLevel[] {
  return setupScope.scopeLevels.filter((level) => level.id !== setupScope.taskListScopeLevelId);
}

/** UI heading for the active task-list scope switcher (e.g. "Active Folder"). */
export function getActiveScopeHeading(setupScope: PlatformSetupScopeConfig): string {
  return `Active ${getTaskListScopeLevel(setupScope).label}`;
}

/** True when website mappings must include a platform site/tenant selection (Jira). */
export function mappingRequiresTenantSite(setupScope: PlatformSetupScopeConfig): boolean {
  return getTenantScopeLevels(setupScope).some((level) => level.listSource === "sites");
}

/** Returns the scope selection for a level, preferring scopeSelections over legacy columns. */
export function getScopeSelection(
  setup: PlatformSetupRecord | null | undefined,
  levelId: string,
): PlatformScopeSelection | null {
  if (!setup) return null;

  const fromScopes = setup.scopeSelections?.[levelId];
  if (fromScopes) return fromScopes;

  if (levelId === JIRA_SITE_LEVEL && setup.siteId) {
    return {
      id: setup.siteId,
      key: setup.siteId,
      name: setup.siteName ?? setup.siteId,
      meta: { url: setup.siteUrl },
    };
  }

  const taskListLevelId = setup.taskListScopeLevelId ?? JIRA_PROJECT_LEVEL;
  if (levelId === taskListLevelId && setup.defaultProjectKey) {
    return {
      id: setup.defaultProjectId,
      key: setup.defaultProjectKey,
      name: setup.defaultProjectName ?? setup.defaultProjectKey,
    };
  }

  return null;
}

/** Key of the leaf task-list scope (e.g. Jira project key). */
export function getTaskListScopeKey(setup: PlatformSetupRecord | null | undefined): string | null {
  if (!setup) return null;

  const levelId = setup.taskListScopeLevelId ?? JIRA_PROJECT_LEVEL;
  return getScopeSelection(setup, levelId)?.key ?? setup.defaultProjectKey ?? null;
}

/** Id of the tenant/site scope when present (e.g. Jira cloudId). */
export function getTenantScopeId(setup: PlatformSetupRecord | null | undefined): string | null {
  if (!setup) return null;

  const taskListLevelId = setup.taskListScopeLevelId ?? JIRA_PROJECT_LEVEL;

  for (const levelId of Object.keys(setup.scopeSelections ?? {})) {
    if (levelId !== taskListLevelId) {
      const selection = getScopeSelection(setup, levelId);
      if (selection?.id) return selection.id;
    }
  }

  if (setup.siteId) {
    return getScopeSelection(setup, JIRA_SITE_LEVEL)?.id ?? setup.siteId;
  }

  return null;
}

/** Builds scopeSelections JSON from legacy Jira setup columns. */
export function buildScopeSelectionsFromJiraLegacy(
  row: Record<string, unknown>,
): Record<string, PlatformScopeSelection> {
  const siteId = String(row["jira_site_id"] ?? "");
  const projectKey = String(row["default_project_key"] ?? "");
  if (!siteId || !projectKey) return {};

  return {
    [JIRA_SITE_LEVEL]: {
      id: siteId,
      key: siteId,
      name: (row["jira_site_name"] as string | null) ?? siteId,
      meta: { url: String(row["jira_site_url"] ?? "") },
    },
    [JIRA_PROJECT_LEVEL]: {
      id: String(row["default_project_id"] ?? ""),
      key: projectKey,
      name: (row["default_project_name"] as string | null) ?? projectKey,
    },
  };
}

/** Derives legacy Jira columns from scopeSelections for dual-write. */
export function jiraLegacyFieldsFromScopeSelections(
  scopeSelections: Record<string, PlatformScopeSelection>,
): {
  siteId: string;
  siteUrl: string;
  siteName: string | null;
  defaultProjectId: string;
  defaultProjectKey: string;
  defaultProjectName: string | null;
} {
  const site = scopeSelections[JIRA_SITE_LEVEL];
  const project = scopeSelections[JIRA_PROJECT_LEVEL];

  if (!site || !project) {
    throw new Error("Jira setup requires site and project scope selections.");
  }

  const siteUrl = typeof site.meta?.url === "string" && site.meta.url ? site.meta.url : site.id;

  return {
    siteId: site.id,
    siteUrl,
    siteName: site.name ?? null,
    defaultProjectId: project.id,
    defaultProjectKey: project.key,
    defaultProjectName: project.name ?? null,
  };
}

/** Builds an upsert payload from wizard scope state. */
export function buildUpsertPlatformSetupPayload(
  scopeSelections: Record<string, PlatformScopeSelection>,
  setupScope: PlatformSetupScopeConfig,
): UpsertPlatformSetupPayload {
  const payload: UpsertPlatformSetupPayload = {
    scopeSelections,
    taskListScopeLevelId: setupScope.taskListScopeLevelId,
  };

  if (scopeSelections[JIRA_SITE_LEVEL] && scopeSelections[JIRA_PROJECT_LEVEL]) {
    const legacy = jiraLegacyFieldsFromScopeSelections(scopeSelections);
    payload.siteId = legacy.siteId;
    payload.siteUrl = legacy.siteUrl;
    payload.siteName = legacy.siteName ?? undefined;
    payload.defaultProjectId = legacy.defaultProjectId;
    payload.defaultProjectKey = legacy.defaultProjectKey;
    payload.defaultProjectName = legacy.defaultProjectName ?? undefined;
  }

  return payload;
}

/** True when every required scope level has a selection. */
export function isSetupScopeComplete(
  scopeSelections: Record<string, PlatformScopeSelection | null>,
  setupScope: PlatformSetupScopeConfig,
): boolean {
  return setupScope.scopeLevels.every((level) => {
    const selection = scopeSelections[level.id];
    if (!selection?.key) return false;
    if (level.parentLevelId && !scopeSelections[level.parentLevelId]?.id) return false;
    return true;
  });
}

/** Clears descendant scope selections when a parent level changes. */
export function clearDescendantScopeSelections(
  scopeSelections: Record<string, PlatformScopeSelection | null>,
  changedLevelId: string,
  setupScope: PlatformSetupScopeConfig,
): Record<string, PlatformScopeSelection | null> {
  const next = { ...scopeSelections, [changedLevelId]: scopeSelections[changedLevelId] };
  const childIds = new Set<string>();
  let added = true;

  while (added) {
    added = false;
    for (const level of setupScope.scopeLevels) {
      if (
        level.parentLevelId &&
        (level.parentLevelId === changedLevelId || childIds.has(level.parentLevelId)) &&
        !childIds.has(level.id)
      ) {
        childIds.add(level.id);
        next[level.id] = null;
        added = true;
      }
    }
  }

  return next;
}

/** Hydrates scope picker state from a persisted setup record. */
export function scopeSelectionsFromSetupRecord(
  setup: PlatformSetupRecord | null,
  setupScope: PlatformSetupScopeConfig,
): Record<string, PlatformScopeSelection | null> {
  const result: Record<string, PlatformScopeSelection | null> = {};
  for (const level of setupScope.scopeLevels) {
    result[level.id] = getScopeSelection(setup, level.id);
  }
  return result;
}
