import { decrypt, encrypt } from "@mp/shared";
import type {
  PlatformProjectStatuses,
  PlatformSetupMapping,
  PlatformSetupRecord,
  PlatformToken,
  UpsertPlatformSetupMappingItem,
  UpsertPlatformSetupPayload,
} from "@mp/task-core";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
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
  JiraTask,
  JiraUser,
  UpdateJiraTaskPayload,
} from "@/types/jira";

/** User identifier passed into service methods; obtain from your auth (e.g. session, JWT). */
export type UserId = string;

const mapSetupRow = (row: Record<string, unknown>): PlatformSetupRecord => ({
  id: String(row["id"]),
  userId: String(row["user_id"]),
  connectionId: String(row["jira_connection_id"]),
  siteId: String(row["jira_site_id"]),
  siteUrl: String(row["jira_site_url"]),
  siteName: (row["jira_site_name"] as string | null) ?? null,
  defaultProjectId: String(row["default_project_id"]),
  defaultProjectKey: String(row["default_project_key"]),
  defaultProjectName: (row["default_project_name"] as string | null) ?? null,
  setupCompletedAt: (row["setup_completed_at"] as string | null) ?? null,
  createdAt: String(row["created_at"]),
  updatedAt: String(row["updated_at"]),
});

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
  createdAt: String(row["created_at"]),
  updatedAt: String(row["updated_at"]),
});

const getJiraBaseUrlForSite = (jiraSite: string): string => {
  // jira_site stores the Atlassian cloudId (UUID). Jira API base URL is:
  // https://api.atlassian.com/ex/jira/{cloudId}
  return `https://api.atlassian.com/ex/jira/${jiraSite}`;
};

/** Returns whether the user has an active Jira connection (no throw). */
export const hasUserJiraConnection = async (userId: UserId): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return !error && !!data;
};

/** Sets the user's Jira connection to inactive (disconnect). */
export const disconnectUserJira = async (userId: UserId): Promise<void> => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("jira_connections")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  const { error: sessionError } = await supabase
    .from("jira_sessions")
    .delete()
    .eq("jira_account_id", userId);

  if (error) throw new Error(`Failed to disconnect Jira: ${error.message}`);
  if (sessionError) throw new Error(`Failed to delete Jira session: ${sessionError.message}`);
};

/** Disconnects Jira AND deletes the user's setup config and site-project mappings. */
export const disconnectAndWipeUserJira = async (userId: UserId): Promise<void> => {
  await disconnectUserJira(userId);
  const supabase = createSupabaseServerClient();
  const { error: mappingsError } = await supabase
    .from("jira_site_project_mappings")
    .delete()
    .eq("user_id", userId);
  const { error: setupError } = await supabase
    .from("jira_user_setup")
    .delete()
    .eq("user_id", userId);

  if (mappingsError) {
    throw new Error(`Failed to delete Jira setup mappings: ${mappingsError.message}`);
  }
  if (setupError) throw new Error(`Failed to delete Jira setup: ${setupError.message}`);
};

export const getUserJiraConnection = async (userId: UserId) => {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("jira_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    throw new Error("No active Jira connection found for user.");
  }

  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = decrypt(data.access_token_encrypted);
    refreshToken = decrypt(data.refresh_token_encrypted);
  } catch {
    // Stored tokens are invalid (e.g. encryption key changed, or corrupted). Mark connection inactive so user can reconnect.
    await supabase
      .from("jira_connections")
      .update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    throw new Error("No active Jira connection found for user.");
  }

  const token: PlatformToken = {
    accessToken,
    refreshToken,
    expiry: data.expiry,
    tokenType: "bearer",
  };

  return {
    jiraSite: data.jira_site as string,
    jiraProject: data.jira_project as string,
    token,
    connectionId: data.id as string,
  };
};

export const saveUserJiraConnection = async (params: {
  userId: UserId;
  jiraSite: string;
  jiraProject: string;
  token: PlatformToken;
}) => {
  const supabase = createSupabaseServerClient();

  const { userId, jiraSite, jiraProject, token } = params;
  const { data: existingConnection } = await supabase
    .from("jira_connections")
    .select("jira_site, jira_project, refresh_token_encrypted, expiry")
    .eq("user_id", userId)
    .maybeSingle();
  const existingSetup = await getUserSetup(userId);
  const existingConnectionValues = existingConnection as {
    jira_site?: string;
    jira_project?: string;
    refresh_token_encrypted?: string | null;
    expiry?: string | null;
  } | null;
  const resolvedJiraSite =
    jiraSite.trim() || existingSetup?.siteId || existingConnectionValues?.jira_site || "";
  const resolvedJiraProject =
    jiraProject.trim() ||
    existingSetup?.defaultProjectKey ||
    existingConnectionValues?.jira_project ||
    "";
  const refreshTokenEncrypted = token.refreshToken
    ? encrypt(token.refreshToken)
    : existingConnectionValues?.refresh_token_encrypted;
  const expiry = token.expiry ?? existingConnectionValues?.expiry;

  if (!refreshTokenEncrypted) {
    throw new Error("Failed to persist Jira connection: missing refresh token.");
  }
  if (!expiry) {
    throw new Error("Failed to persist Jira connection: missing token expiry.");
  }

  const { data, error } = await supabase
    .from("jira_connections")
    .upsert(
      {
        user_id: userId,
        jira_site: resolvedJiraSite,
        jira_project: resolvedJiraProject,
        access_token_encrypted: encrypt(token.accessToken),
        refresh_token_encrypted: refreshTokenEncrypted,
        expiry,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist Jira connection: ${error?.message ?? "Unknown error"}`);
  }

  await supabase.from("sync_logs").insert({
    user_id: userId,
    jira_connection_id: data.id,
    action: "connection_updated",
    details: { jiraSite: resolvedJiraSite },
  });

  return data;
};

export const updateUserJiraProject = async (userId: UserId, projectKey: string): Promise<void> => {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("jira_connections")
    .update({
      jira_project: projectKey,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to update Jira project: ${error.message}`);
  }
};

export const createJiraSession = async (
  jiraAccountId: string,
  sessionToken: string,
  expiry: Date,
) => {
  const supabase = createSupabaseServerClient();

  // Remove any existing sessions for this Jira account
  await supabase.from("jira_sessions").delete().eq("jira_account_id", jiraAccountId);

  const { error } = await supabase.from("jira_sessions").insert({
    session_token: sessionToken,
    jira_account_id: jiraAccountId,
    expires_at: expiry,
  });

  if (error) {
    throw new Error(`Failed to create Jira session: ${error.message}`);
  }
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

  const jiraSite = options.jiraSite?.trim() || connection.jiraSite;

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
  const supabase = createSupabaseServerClient();
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

    await supabase.from("sync_logs").insert({
      user_id: userId,
      jira_connection_id: connection.connectionId,
      action: "token_refreshed",
      details: {},
    });

    return newToken;
  } catch (error) {
    const status =
      (error as { statusCode?: number }).statusCode ??
      (error as { response?: { status?: number } }).response?.status;

    const isAuthError = status === 401 || status === 403;

    if (isAuthError) {
      await supabase
        .from("jira_connections")
        .update({
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.connectionId);

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
): Promise<PlatformProjectStatuses[]> => {
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
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_user_setup")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch setup: ${error.message}`);
  return data ? mapSetupRow(data as Record<string, unknown>) : null;
};

export const upsertUserSetup = async (
  userId: UserId,
  connectionId: string,
  params: UpsertPlatformSetupPayload,
): Promise<PlatformSetupRecord> => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_user_setup")
    .upsert(
      {
        user_id: userId,
        jira_connection_id: connectionId,
        jira_site_id: params.siteId,
        jira_site_url: params.siteUrl,
        jira_site_name: params.siteName ?? null,
        default_project_id: params.defaultProjectId,
        default_project_key: params.defaultProjectKey,
        default_project_name: params.defaultProjectName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to upsert setup: ${error?.message ?? "Unknown error"}`);
  }

  // Keep jira_connections in sync so the adapter keeps working with the selected site/project.
  const { error: connectionUpdateError } = await supabase
    .from("jira_connections")
    .update({
      jira_site: params.siteId,
      jira_project: params.defaultProjectKey,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active");
  if (connectionUpdateError) {
    throw new Error(`Failed to sync Jira connection setup: ${connectionUpdateError.message}`);
  }

  return mapSetupRow(data as Record<string, unknown>);
};

export const completeUserSetup = async (userId: UserId): Promise<void> => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("jira_user_setup")
    .update({
      setup_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to complete setup: ${error.message}`);
};

export const getUserSetupMappings = async (userId: UserId): Promise<PlatformSetupMapping[]> => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_site_project_mappings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to fetch setup mappings: ${error.message}`);
  return (data ?? []).map((row) => mapSetupMappingRow(row as Record<string, unknown>));
};

export const upsertUserSetupMappings = async (
  userId: UserId,
  connectionId: string,
  mappings: UpsertPlatformSetupMappingItem[],
): Promise<PlatformSetupMapping[]> => {
  const supabase = createSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("jira_site_project_mappings")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw new Error(`Failed to clear existing mappings: ${deleteError.message}`);

  if (mappings.length === 0) return [];

  const rows = mappings.map((m) => ({
    user_id: userId,
    jira_connection_id: connectionId,
    sai_site_id: m.externalResourceId,
    sai_site_name: m.externalResourceName ?? null,
    jira_site_id: m.siteId ?? null,
    jira_site_url: m.siteUrl ?? null,
    jira_site_name: m.siteName ?? null,
    jira_project_id: m.projectId,
    jira_project_key: m.projectKey,
    jira_project_name: m.projectName ?? null,
  }));

  const { data, error } = await supabase.from("jira_site_project_mappings").insert(rows).select();
  if (error) throw new Error(`Failed to insert mappings: ${error.message}`);
  return (data ?? []).map((row) => mapSetupMappingRow(row as Record<string, unknown>));
};
