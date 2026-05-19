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
import type { PlatformToken } from "@/types/platform";
import { decrypt, encrypt } from "@/utils/encryption";

/** User identifier passed into service methods; obtain from your auth (e.g. session, JWT). */
export type UserId = string;

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

/** Sets the user's Jira connection to inactive (disconnect). Previously saved setup and mappings are retained so they are restored on reconnect. */
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

/**
 * Disconnects Jira AND wipes all setup configuration (jira_user_setup + jira_site_project_mappings).
 * Use when the user explicitly selects "Disconnect and wipe all settings".
 * The user will be shown the Setup Wizard again on next reconnect.
 */
export const disconnectAndWipeUserJira = async (userId: UserId): Promise<void> => {
  const supabase = createSupabaseServerClient();

  const { error: connError } = await supabase
    .from("jira_connections")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  const { error: sessionError } = await supabase
    .from("jira_sessions")
    .delete()
    .eq("jira_account_id", userId);

  // Wipe mappings first (FK child), then setup (FK child of connections).
  const { error: mappingsError } = await supabase
    .from("jira_site_project_mappings")
    .delete()
    .eq("user_id", userId);

  const { error: setupError } = await supabase
    .from("jira_user_setup")
    .delete()
    .eq("user_id", userId);

  if (connError) throw new Error(`Failed to disconnect Jira: ${connError.message}`);
  if (sessionError) throw new Error(`Failed to delete Jira session: ${sessionError.message}`);
  if (mappingsError) throw new Error(`Failed to wipe site mappings: ${mappingsError.message}`);
  if (setupError) throw new Error(`Failed to wipe setup data: ${setupError.message}`);
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
  jiraSite?: string;
  jiraProject?: string;
  token: PlatformToken;
}) => {
  const supabase = createSupabaseServerClient();

  const { userId, jiraSite, jiraProject, token } = params;

  const { data, error } = await supabase
    .from("jira_connections")
    .upsert(
      {
        user_id: userId,
        jira_site: jiraSite,
        jira_project: jiraProject,
        access_token_encrypted: encrypt(token.accessToken),
        refresh_token_encrypted: encrypt(token.refreshToken),
        expiry: token.expiry,
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
    details: { jiraSite },
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

export const createJiraAdapterForUser = async (userId: UserId, jiraSiteOverride?: string) => {
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

  const setup = await getUserSetup(userId);
  const activeJiraSite = jiraSiteOverride ?? setup?.jira_site_id;

  if (!activeJiraSite || activeJiraSite.trim() === "") {
    throw new Error("No Jira site selected. Please reconnect to Jira and select a site.");
  }

  const baseUrl = getJiraBaseUrlForSite(activeJiraSite);
  const adapter = new JiraAdapter(baseUrl);

  return {
    adapter,
    token: connection.token,
    connectionId: connection.connectionId,
    jiraSite: activeJiraSite,
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
  jiraSiteOverride?: string,
): Promise<JiraProject[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getProjects(token);
};

export const getJiraIssueTypesForProject = async (
  userId: UserId,
  projectId: string,
  jiraSiteOverride?: string,
): Promise<JiraIssueType[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getIssueTypes(token, projectId);
};

export const createJiraTaskForUser = async (
  userId: UserId,
  payload: CreateJiraTaskPayload,
  jiraSiteOverride?: string,
): Promise<JiraTask> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.createTask(token, payload);
};

export const getJiraPrioritiesForUser = async (
  userId: UserId,
  jiraSiteOverride?: string,
): Promise<JiraPriority[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getPriorities(token);
};

export const getJiraPrioritiesForProject = async (
  userId: UserId,
  projectId: string,
  jiraSiteOverride?: string,
): Promise<JiraPriority[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getPrioritiesForProject(token, projectId);
};

export const searchJiraAssigneesForUser = async (
  userId: UserId,
  params: { projectIdOrKey: string; query?: string },
  jiraSiteOverride?: string,
): Promise<JiraUser[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.searchAssignees(token, params);
};

export const getJiraIssuesForProject = async (
  userId: UserId,
  projectKey: string,
  cursor?: string,
  filters?: JiraIssueFilters,
  jiraSiteOverride?: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getProjectIssues(token, projectKey, cursor, filters);
};

export const getDetailsForIssue = async (
  userId: UserId,
  issueIdOrKey: string,
  jiraSiteOverride?: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
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
  jiraSiteOverride?: string,
): Promise<Array<{ id: string; name: string }>> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getProjectIssueStatuses(token, projectKey);
};

export const deleteJiraIssue = async (
  userId: UserId,
  issueIdOrKey: string,
  jiraSiteOverride?: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.deleteIssue(token, issueIdOrKey);
};

export const getPermission = async (
  userId: UserId,
  permission: string,
  options?: {
    issueKey?: string;
    projectKey?: string;
  },
  jiraSiteOverride?: string,
): Promise<boolean> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getPermission(token, permission, options);
};

export const getCommentsForIssue = async (
  userId: UserId,
  issueIdOrKey: string,
  jiraSiteOverride?: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getIssueComments(token, issueIdOrKey);
};

export const getDetailsForComment = async (
  userId: UserId,
  issueIdOrKey: string,
  commentId: string,
  jiraSiteOverride?: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getCommentDetails(token, issueIdOrKey, commentId);
};

export const createCommentForIssue = async (
  userId: UserId,
  payload: CreateCommentPayload,
  jiraSiteOverride?: string,
): Promise<JiraComment> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
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
  jiraSiteOverride?: string,
): Promise<JiraIssue> => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.updateTask(token, issueIdOrKey, payload);
};

export const issueStatusChange = async (
  issueIdOrKey: string,
  transitionId: string,
  userId: UserId,
  jiraSiteOverride?: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.issueStatusChange(token, issueIdOrKey, transitionId);
};

export const getIssueTransitions = async (
  issueIdOrKey: string,
  userId: UserId,
  jiraSiteOverride?: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId, jiraSiteOverride);
  return adapter.getIssueTransitions(token, issueIdOrKey);
};

//  ---------------------------------------------------------------------------
//  Setup Wizard
//  ---------------------------------------------------------------------------

export const getUserSetup = async (userId: UserId) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_user_setup")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch setup: ${error.message}`);
  return data;
};

export const upsertUserSetup = async (
  userId: UserId,
  connectionId: string,
  params: {
    jiraSiteId: string;
    jiraSiteUrl: string;
    jiraSiteName?: string;
    defaultProjectId: string;
    defaultProjectKey: string;
    defaultProjectName?: string;
  },
) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_user_setup")
    .upsert(
      {
        user_id: userId,
        jira_connection_id: connectionId,
        jira_site_id: params.jiraSiteId,
        jira_site_url: params.jiraSiteUrl,
        jira_site_name: params.jiraSiteName ?? null,
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

  // Keep jira_connections in sync so existing adapter code keeps working.
  await supabase
    .from("jira_connections")
    .update({
      jira_site: params.jiraSiteId,
      jira_project: params.defaultProjectKey,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active");

  return data;
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

export const getUserSetupMappings = async (userId: UserId) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_site_project_mappings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to fetch setup mappings: ${error.message}`);
  return data ?? [];
};

export const upsertUserSetupMappings = async (
  userId: UserId,
  connectionId: string,
  mappings: Array<{
    saiSiteId: string;
    saiSiteName?: string;
    /** Override the Jira instance for this site. Omit to inherit from jira_user_setup. */
    jiraSiteId?: string;
    jiraSiteUrl?: string;
    jiraSiteName?: string;
    jiraProjectId: string;
    jiraProjectKey: string;
    jiraProjectName?: string;
  }>,
) => {
  const supabase = createSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("jira_site_project_mappings")
    .delete()
    .eq("user_id", userId);
  if (deleteError) {
    throw new Error(`Failed to clear existing mappings: ${deleteError.message}`);
  }

  if (mappings.length === 0) return [];

  const rows = mappings.map((m) => ({
    user_id: userId,
    jira_connection_id: connectionId,
    sai_site_id: m.saiSiteId,
    sai_site_name: m.saiSiteName ?? null,
    jira_site_id: m.jiraSiteId ?? null,
    jira_site_url: m.jiraSiteUrl ?? null,
    jira_site_name: m.jiraSiteName ?? null,
    jira_project_id: m.jiraProjectId,
    jira_project_key: m.jiraProjectKey,
    jira_project_name: m.jiraProjectName ?? null,
  }));

  const { data, error } = await supabase.from("jira_site_project_mappings").insert(rows).select();
  if (error) throw new Error(`Failed to insert mappings: ${error.message}`);
  return data ?? [];
};
