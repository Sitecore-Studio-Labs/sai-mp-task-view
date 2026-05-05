import { decrypt, encrypt } from "@mp/shared";
import type { PlatformToken } from "@mp/task-core";

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

  const { data, error } = await supabase
    .from("jira_connections")
    .upsert(
      {
        user_id: userId,
        jira_site: jiraSite,
        jira_project: jiraProject,
        access_token_encrypted: encrypt(token.accessToken),
        refresh_token_encrypted: token.refreshToken ? encrypt(token.refreshToken) : null,
        expiry: token.expiry ?? null,
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

export const createJiraAdapterForUser = async (userId: UserId) => {
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

  if (!connection.jiraSite || connection.jiraSite.trim() === "") {
    throw new Error("No Jira site selected. Please reconnect to Jira and select a site.");
  }

  const baseUrl = getJiraBaseUrlForSite(connection.jiraSite);
  const adapter = new JiraAdapter(baseUrl);

  return {
    adapter,
    token: connection.token,
    connectionId: connection.connectionId,
    jiraSite: connection.jiraSite,
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

export const getJiraProjectsForUser = async (userId: UserId): Promise<JiraProject[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
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
): Promise<Array<{ id: string; name: string }>> => {
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
