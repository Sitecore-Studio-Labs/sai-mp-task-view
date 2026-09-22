import { query } from "@mp/db";
import type {
  PlatformScopeSelection,
  PlatformSetupMapping,
  PlatformSetupRecord,
  PlatformToken,
  UpsertPlatformSetupMappingItem,
  UpsertPlatformSetupPayload,
} from "@mp/task-core";
import {
  buildScopeSelectionsFromJiraLegacy,
  jiraLegacyFieldsFromScopeSelections,
} from "@mp/task-core";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { getSiteOverride } from "@/lib/siteOverrideContext";
import { createJiraTokenStore } from "@/lib/tokenStore";
import { JiraAdapter } from "@/platforms/jira/JiraAdapter";
import type {
  CreateCommentPayload,
  CreateJiraTaskPayload,
  JiraComment,
  JiraIssue,
  JiraIssueFilters,
  JiraIssueType,
  JiraPriority,
  JiraProject,
  JiraProjectStatuses,
  JiraTask,
  JiraUser,
  UpdateJiraTaskPayload,
} from "@/types/jira";

/** User identifier passed into service methods; obtain from your auth (e.g. session, JWT). */
export type UserId = string;

function dbErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toIsoStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return String(value);
}

const mapSetupRow = (row: Record<string, unknown>): PlatformSetupRecord => {
  const scopeSelectionsRaw = row["scope_selections"];
  const scopeSelections: Record<string, PlatformScopeSelection> =
    scopeSelectionsRaw &&
    typeof scopeSelectionsRaw === "object" &&
    !Array.isArray(scopeSelectionsRaw)
      ? (scopeSelectionsRaw as Record<string, PlatformScopeSelection>)
      : buildScopeSelectionsFromJiraLegacy(row);

  const legacy =
    scopeSelections.site && scopeSelections.project
      ? jiraLegacyFieldsFromScopeSelections(scopeSelections)
      : {
          siteId: String(row["jira_site_id"]),
          siteUrl: String(row["jira_site_url"]),
          siteName: (row["jira_site_name"] as string | null) ?? null,
          defaultProjectId: String(row["default_project_id"]),
          defaultProjectKey: String(row["default_project_key"]),
          defaultProjectName: (row["default_project_name"] as string | null) ?? null,
        };

  return {
    id: String(row["id"]),
    userId: String(row["user_id"]),
    connectionId: String(row["jira_connection_id"]),
    scopeSelections,
    taskListScopeLevelId: (row["task_list_scope_level_id"] as string | null) ?? "project",
    siteId: legacy.siteId,
    siteUrl: legacy.siteUrl,
    siteName: legacy.siteName,
    defaultProjectId: legacy.defaultProjectId,
    defaultProjectKey: legacy.defaultProjectKey,
    defaultProjectName: legacy.defaultProjectName,
    setupCompletedAt: toIsoStringOrNull(row["setup_completed_at"]),
    createdAt: toIsoString(row["created_at"]),
    updatedAt: toIsoString(row["updated_at"]),
  };
};

const mapSetupMappingRow = (row: Record<string, unknown>): PlatformSetupMapping => ({
  id: String(row["id"]),
  userId: String(row["user_id"]),
  connectionId: String(row["jira_connection_id"]),
  externalResourceId: String(row["sai_site_id"]),
  externalResourceName: (row["sai_site_name"] as string | null) ?? null,
  siteId: (row["jira_site_id"] as string | null) ?? null,
  siteUrl: (row["jira_site_url"] as string | null) ?? null,
  siteName: (row["jira_site_name"] as string | null) ?? null,
  projectId: String(row["jira_project_id"]),
  projectKey: String(row["jira_project_key"]),
  projectName: (row["jira_project_name"] as string | null) ?? null,
  createdAt: toIsoString(row["created_at"]),
  updatedAt: toIsoString(row["updated_at"]),
});

const getJiraBaseUrlForSite = (jiraSite: string): string => {
  // jira_site stores the Atlassian cloudId (UUID). Jira API base URL is:
  // https://api.atlassian.com/ex/jira/{cloudId}
  return `https://api.atlassian.com/ex/jira/${jiraSite}`;
};

async function insertSyncLog(
  userId: UserId,
  connectionId: string,
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await query(
      `INSERT INTO sync_logs (user_id, jira_connection_id, action, details)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [userId, connectionId, action, JSON.stringify(details)],
    );
  } catch (err) {
    console.error("[jiraService] Failed to write sync log:", err);
  }
}

/** Returns whether the user has an active Jira connection (no throw). */
export const hasUserJiraConnection = async (userId: UserId): Promise<boolean> => {
  const connection = await createJiraTokenStore().getConnection(userId);
  return connection !== null;
};

/** Sets the user's Jira connection to inactive (disconnect). */
export const disconnectUserJira = async (userId: UserId): Promise<void> => {
  const store = createJiraTokenStore();
  const connection = await store.getConnection(userId);
  if (connection) {
    await store.deactivateConnection(connection.connectionId);
  }
  await store.deleteSessionsForUser(userId);
};

/** Disconnects Jira AND deletes the user's setup config and site-project mappings. */
export const disconnectAndWipeUserJira = async (userId: UserId): Promise<void> => {
  await disconnectUserJira(userId);
  try {
    await query(`delete from jira_site_project_mappings where user_id = $1`, [userId]);
  } catch (err) {
    throw new Error(`Failed to delete Jira setup mappings: ${dbErrorMessage(err)}`);
  }
  try {
    await query(`delete from jira_user_setup where user_id = $1`, [userId]);
  } catch (err) {
    throw new Error(`Failed to delete Jira setup: ${dbErrorMessage(err)}`);
  }
};

export const getUserJiraConnection = async (userId: UserId) => {
  const connection = await createJiraTokenStore().getConnection(userId);
  if (!connection) {
    throw new Error("No active Jira connection found for user.");
  }

  const token: PlatformToken = {
    accessToken: connection.token.accessToken,
    refreshToken: connection.token.refreshToken,
    expiry: connection.token.expiry,
    tokenType: "bearer",
  };

  return {
    jiraSite: connection.platformSite,
    jiraProject: connection.platformProject,
    token,
    connectionId: connection.connectionId,
  };
};

export const saveUserJiraConnection = async (params: {
  userId: UserId;
  jiraSite: string;
  jiraProject: string;
  token: PlatformToken;
}) => {
  const store = createJiraTokenStore();
  const { userId, jiraSite, jiraProject, token } = params;

  const existingConnection = await store.getConnection(userId);
  let existingSetup: PlatformSetupRecord | null = null;
  try {
    existingSetup = await getUserSetup(userId);
  } catch (err) {
    console.error("[jiraService] Failed to load setup while saving connection:", err);
  }

  const resolvedJiraSite =
    jiraSite.trim() || existingSetup?.siteId || existingConnection?.platformSite || "";
  const resolvedJiraProject =
    jiraProject.trim() ||
    existingSetup?.defaultProjectKey ||
    existingConnection?.platformProject ||
    "";
  const refreshToken = token.refreshToken ?? existingConnection?.token.refreshToken;
  const expiry = token.expiry ?? existingConnection?.token.expiry;

  if (!refreshToken) {
    throw new Error("Failed to persist Jira connection: missing refresh token.");
  }
  if (!expiry) {
    throw new Error("Failed to persist Jira connection: missing token expiry.");
  }

  const connectionId = await store.saveConnection({
    userId,
    platformSite: resolvedJiraSite,
    platformProject: resolvedJiraProject,
    token: {
      accessToken: token.accessToken,
      refreshToken,
      expiry,
      tokenType: "bearer",
    },
  });

  await insertSyncLog(userId, connectionId, "connection_updated", { jiraSite: resolvedJiraSite });

  return { id: connectionId };
};

export const updateUserJiraProject = async (userId: UserId, projectKey: string): Promise<void> => {
  await createJiraTokenStore().updateProject(userId, projectKey);
};

export const updateUserJiraSite = async (userId: UserId, siteId: string): Promise<void> => {
  const store = createJiraTokenStore();
  const connection = await store.getConnection(userId);
  if (!connection) return;
  await store.saveConnection({
    userId,
    platformSite: siteId,
    platformProject: "",
    token: connection.token,
  });
};

export const createJiraSession = async (
  jiraAccountId: string,
  sessionToken: string,
  expiry: Date,
) => {
  await createJiraTokenStore().createSession(jiraAccountId, sessionToken, expiry);
};

export const createJiraAdapterForUser = async (
  userId: UserId,
  options: { jiraSite?: string } = {},
) => {
  let connection = await getUserJiraConnection(userId);

  const now = Date.now();
  const expiryTime = connection.token.expiry ? new Date(connection.token.expiry).getTime() : null;

  if (expiryTime !== null && expiryTime <= now + 60_000) {
    const refreshedToken = await refreshUserJiraToken(userId);
    connection = {
      ...connection,
      token: refreshedToken,
    };
  }

  // Site resolution precedence:
  //  1. explicit `options.jiraSite` — caller passed a site directly (e.g. projects route)
  //  2. request-scoped override — the user's temporary UI site selection (header/query)
  //  3. persisted `connection.jiraSite` — the configured default (persistence is the default)
  const jiraSite = options.jiraSite?.trim() || getSiteOverride() || connection.jiraSite;

  if (!jiraSite || jiraSite.trim() === "") {
    throw new Error("No Jira site selected. Please reconnect to Jira and select a site.");
  }

  const baseUrl = getJiraBaseUrlForSite(jiraSite);
  const adapter = new JiraAdapter(baseUrl);

  return {
    adapter,
    token: connection.token,
    connectionId: connection.connectionId,
    jiraSite,
  };
};

export const refreshUserJiraToken = async (userId: UserId): Promise<PlatformToken> => {
  const store = createJiraTokenStore();
  const connection = await getUserJiraConnection(userId);
  const adapter = new JiraAdapter(getJiraBaseUrlForSite(connection.jiraSite));

  try {
    const newToken = await adapter.refreshToken(connection.token);

    await saveUserJiraConnection({
      userId,
      jiraSite: connection.jiraSite,
      jiraProject: connection.jiraProject,
      token: newToken,
    });

    await insertSyncLog(userId, connection.connectionId, "token_refreshed", {});

    return newToken;
  } catch (error) {
    const status =
      (error as { statusCode?: number }).statusCode ??
      (error as { response?: { status?: number } }).response?.status;

    const isAuthError = status === 401 || status === 403;

    if (isAuthError) {
      await store.deactivateConnection(connection.connectionId);
      throw new JiraAuthError();
    }

    throw error;
  }
};

export const getJiraProjectsForUser = async (
  userId: UserId,
  jiraSite?: string,
): Promise<JiraProject[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, { jiraSite });
  return adapter.getProjects(token);
};

export const getJiraIssueTypesForProject = async (
  userId: UserId,
  projectId: string,
): Promise<JiraIssueType[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getIssueTypes(token, projectId);
};

export const createJiraTaskForUser = async (
  userId: UserId,
  payload: CreateJiraTaskPayload,
): Promise<JiraTask> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.createTask(token, payload);
};

export const getJiraPrioritiesForUser = async (userId: UserId): Promise<JiraPriority[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getPriorities(token);
};

export const getJiraPrioritiesForProject = async (
  userId: UserId,
  projectId: string,
): Promise<JiraPriority[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getPrioritiesForProject(token, projectId);
};

export const searchJiraAssigneesForUser = async (
  userId: UserId,
  params: { projectIdOrKey: string; query?: string },
): Promise<JiraUser[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.searchAssignees(token, params);
};

export const getJiraIssuesForProject = async (
  userId: UserId,
  projectKey: string,
  cursor?: string,
  filters?: JiraIssueFilters,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getProjectIssues(token, projectKey, cursor, filters);
};

export const getDetailsForIssue = async (userId: UserId, issueIdOrKey: string) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getIssueDetails(token, issueIdOrKey);
};

export const getJiraCurrentUser = async (userId: UserId): Promise<JiraUser> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getMyself(token);
};

export const addAttachmentToJiraIssue = async (
  userId: UserId,
  issueIdOrKey: string,
  file: { buffer: Buffer; fileName: string; mimeType: string },
): Promise<void> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.addAttachment(token, issueIdOrKey, file);
};

export const getProjectIssueStatuses = async (
  userId: UserId,
  projectKey: string,
): Promise<JiraProjectStatuses[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getProjectIssueStatuses(token, projectKey);
};

export const deleteJiraIssue = async (userId: UserId, issueIdOrKey: string) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.deleteIssue(token, issueIdOrKey);
};

export const getPermission = async (
  userId: UserId,
  permission: string,
  options?: {
    issueKey?: string;
    projectKey?: string;
  },
): Promise<boolean> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);

  return adapter.getPermission(token, permission, options);
};

export const getCommentsForIssue = async (userId: UserId, issueIdOrKey: string) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getIssueComments(token, issueIdOrKey);
};

export const getDetailsForComment = async (
  userId: UserId,
  issueIdOrKey: string,
  commentId: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getCommentDetails(token, issueIdOrKey, commentId);
};

export const createCommentForIssue = async (
  userId: UserId,
  payload: CreateCommentPayload,
): Promise<JiraComment> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.createComment(token, payload);
};

export type JiraWebhookRegistrationInput = {
  events: string[];
  jqlFilter?: string;
};

export const registerJiraWebhooks = async (
  userId: UserId,
  callbackUrl: string,
  webhooks: JiraWebhookRegistrationInput[],
): Promise<Array<{ createdWebhookId?: number; errors?: string[] }>> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.registerWebhooks(token, callbackUrl, webhooks);
};

export const getAttachmentContent = async (attachmentId: string, userId: UserId) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getAttachmentContent(token, attachmentId);
};

export async function deleteAttachmentForUser(userId: UserId, attachmentId: string): Promise<void> {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  await adapter.deleteAttachment(token, attachmentId);
}

export const updateJiraTaskForUser = async (
  userId: UserId,
  issueIdOrKey: string,
  payload: UpdateJiraTaskPayload,
): Promise<JiraIssue> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.updateTask(token, issueIdOrKey, payload);
};

export const issueStatusChange = async (
  issueIdOrKey: string,
  transitionId: string,
  userId: UserId,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.issueStatusChange(token, issueIdOrKey, transitionId);
};

export const getIssueTransitions = async (issueIdOrKey: string, userId: UserId) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);

  return adapter.getIssueTransitions(token, issueIdOrKey);
};

// ── Setup wizard ──────────────────────────────────────────────────────────────

export const getUserSetup = async (userId: UserId): Promise<PlatformSetupRecord | null> => {
  try {
    const { rows } = await query<Record<string, unknown>>(
      `select * from jira_user_setup where user_id = $1 limit 1`,
      [userId],
    );
    const data = rows[0] ?? null;
    return data ? mapSetupRow(data) : null;
  } catch (err) {
    throw new Error(`Failed to fetch setup: ${dbErrorMessage(err)}`);
  }
};

export const upsertUserSetup = async (
  userId: UserId,
  connectionId: string,
  params: UpsertPlatformSetupPayload,
): Promise<PlatformSetupRecord> => {
  let scopeSelections = params.scopeSelections;
  const taskListScopeLevelId = params.taskListScopeLevelId ?? "project";

  if (!scopeSelections || Object.keys(scopeSelections).length === 0) {
    if (
      !params.siteId ||
      !params.siteUrl ||
      !params.defaultProjectId ||
      !params.defaultProjectKey
    ) {
      throw new Error("Setup requires scopeSelections or legacy Jira site/project fields.");
    }
    scopeSelections = {
      site: {
        id: params.siteId,
        key: params.siteId,
        name: params.siteName ?? params.siteId,
        meta: { url: params.siteUrl },
      },
      project: {
        id: params.defaultProjectId,
        key: params.defaultProjectKey,
        name: params.defaultProjectName ?? params.defaultProjectKey,
      },
    };
  }

  const legacy = jiraLegacyFieldsFromScopeSelections(scopeSelections);

  let data: Record<string, unknown> | undefined;
  try {
    const { rows } = await query<Record<string, unknown>>(
      `insert into jira_user_setup (
         user_id, jira_connection_id, jira_site_id, jira_site_url, jira_site_name,
         default_project_id, default_project_key, default_project_name,
         scope_selections, task_list_scope_level_id, updated_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, now())
       on conflict (user_id) do update set
         jira_connection_id = excluded.jira_connection_id,
         jira_site_id = excluded.jira_site_id,
         jira_site_url = excluded.jira_site_url,
         jira_site_name = excluded.jira_site_name,
         default_project_id = excluded.default_project_id,
         default_project_key = excluded.default_project_key,
         default_project_name = excluded.default_project_name,
         scope_selections = excluded.scope_selections,
         task_list_scope_level_id = excluded.task_list_scope_level_id,
         updated_at = now()
       returning *`,
      [
        userId,
        connectionId,
        legacy.siteId,
        legacy.siteUrl,
        legacy.siteName,
        legacy.defaultProjectId,
        legacy.defaultProjectKey,
        legacy.defaultProjectName,
        JSON.stringify(scopeSelections),
        taskListScopeLevelId,
      ],
    );
    data = rows[0];
  } catch (err) {
    throw new Error(`Failed to upsert setup: ${dbErrorMessage(err)}`);
  }
  if (!data) {
    throw new Error("Failed to upsert setup: Unknown error");
  }

  // Keep jira_connections in sync so the adapter keeps working with the selected site/project.
  const store = createJiraTokenStore();
  const connection = await store.getConnection(userId);
  if (connection) {
    await store.saveConnection({
      userId,
      platformSite: legacy.siteId,
      platformProject: legacy.defaultProjectKey,
      token: connection.token,
    });
  }

  return mapSetupRow(data);
};

export const completeUserSetup = async (userId: UserId): Promise<void> => {
  try {
    await query(
      `update jira_user_setup
       set setup_completed_at = now(), updated_at = now()
       where user_id = $1`,
      [userId],
    );
  } catch (err) {
    throw new Error(`Failed to complete setup: ${dbErrorMessage(err)}`);
  }
};

export const getUserSetupMappings = async (userId: UserId): Promise<PlatformSetupMapping[]> => {
  try {
    const { rows } = await query<Record<string, unknown>>(
      `select * from jira_site_project_mappings where user_id = $1 order by created_at asc`,
      [userId],
    );
    return rows.map((row) => mapSetupMappingRow(row));
  } catch (err) {
    throw new Error(`Failed to fetch setup mappings: ${dbErrorMessage(err)}`);
  }
};

export const upsertUserSetupMappings = async (
  userId: UserId,
  connectionId: string,
  mappings: UpsertPlatformSetupMappingItem[],
): Promise<PlatformSetupMapping[]> => {
  try {
    await query(`delete from jira_site_project_mappings where user_id = $1`, [userId]);
  } catch (err) {
    throw new Error(`Failed to clear existing mappings: ${dbErrorMessage(err)}`);
  }

  if (mappings.length === 0) return [];

  const values: unknown[] = [];
  const placeholders = mappings.map((m, index) => {
    const offset = index * 10;
    values.push(
      userId,
      connectionId,
      m.externalResourceId,
      m.externalResourceName ?? null,
      m.siteId ?? null,
      m.siteUrl ?? null,
      m.siteName ?? null,
      m.projectId,
      m.projectKey,
      m.projectName ?? null,
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
  });

  try {
    const { rows } = await query<Record<string, unknown>>(
      `insert into jira_site_project_mappings (
         user_id, jira_connection_id, sai_site_id, sai_site_name,
         jira_site_id, jira_site_url, jira_site_name,
         jira_project_id, jira_project_key, jira_project_name
       ) values ${placeholders.join(", ")}
       returning *`,
      values,
    );
    return rows.map((row) => mapSetupMappingRow(row));
  } catch (err) {
    throw new Error(`Failed to insert mappings: ${dbErrorMessage(err)}`);
  }
};
