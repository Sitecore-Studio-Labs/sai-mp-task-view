import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { encrypt, decrypt } from "@/utils/encryption";
import { JiraAdapter } from "@/platforms/jira/JiraAdapter";
import type { PlatformToken } from "@/types/platform";
import type {
  JiraProject,
  JiraIssueType,
  JiraTask,
  CreateJiraTaskPayload,
  JiraPriority,
  JiraUser,
} from "@/types/jira";

/** User identifier passed into service methods; obtain from your auth (e.g. session, JWT). */
export type UserId = string;

const getJiraBaseUrlForSite = (jiraSite: string): string => {
  // jira_site stores the Atlassian cloudId (UUID). Jira API base URL is:
  // https://api.atlassian.com/ex/jira/{cloudId}
  return `https://api.atlassian.com/ex/jira/${jiraSite}`;
};

/** Returns whether the user has an active Jira connection (no throw). */
export const hasUserJiraConnection = async (
  userId: UserId,
): Promise<boolean> => {
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
  if (error) throw new Error(`Failed to disconnect Jira: ${error.message}`);
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

  const token: PlatformToken = {
    accessToken: decrypt(data.access_token_encrypted),
    refreshToken: decrypt(data.refresh_token_encrypted),
    expiry: data.expiry,
    tokenType: "bearer",
  };

  return {
    jiraSite: data.jira_site as string,
    token,
    connectionId: data.id as string,
  };
};

export const saveUserJiraConnection = async (params: {
  userId: UserId;
  jiraSite: string;
  token: PlatformToken;
}) => {
  const supabase = createSupabaseServerClient();

  const { userId, jiraSite, token } = params;

  const { data, error } = await supabase
    .from("jira_connections")
    .upsert(
      {
        user_id: userId,
        jira_site: jiraSite,
        access_token_encrypted: encrypt(token.accessToken),
        refresh_token_encrypted: encrypt(token.refreshToken),
        expiry: token.expiry,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,jira_site",
      },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to persist Jira connection: ${error?.message ?? "Unknown error"}`,
    );
  }

  await supabase.from("sync_logs").insert({
    user_id: userId,
    jira_connection_id: data.id,
    action: "connection_updated",
    details: { jiraSite },
  });

  return data;
};

export const createJiraAdapterForUser = async (userId: UserId) => {
  const connection = await getUserJiraConnection(userId);
  const baseUrl = getJiraBaseUrlForSite(connection.jiraSite);
  const adapter = new JiraAdapter(baseUrl);

  return {
    adapter,
    token: connection.token,
    connectionId: connection.connectionId,
    jiraSite: connection.jiraSite,
  };
};

export const refreshUserJiraToken = async (
  userId: UserId,
): Promise<PlatformToken> => {
  const supabase = createSupabaseServerClient();
  const connection = await getUserJiraConnection(userId);
  const adapter = new JiraAdapter(getJiraBaseUrlForSite(connection.jiraSite));

  const newToken = await adapter.refreshToken(connection.token);

  await saveUserJiraConnection({
    userId,
    jiraSite: connection.jiraSite,
    token: newToken,
  });

  await supabase.from("sync_logs").insert({
    user_id: userId,
    jira_connection_id: connection.connectionId,
    action: "token_refreshed",
    details: {},
  });

  return newToken;
};

export const getJiraProjectsForUser = async (
  userId: UserId,
): Promise<JiraProject[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getProjects(token);
};

export const getJiraIssueTypesForUser = async (
  userId: UserId,
  projectIdOrKey: string
): Promise<JiraIssueType[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getIssueTypes(token, projectIdOrKey);
};

export const createJiraTaskForUser = async (
  userId: UserId,
  payload: CreateJiraTaskPayload
): Promise<JiraTask> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.createTask(token, payload);
};

export const getJiraPrioritiesForUser = async (userId: UserId): Promise<JiraPriority[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getPriorities(token);
};

export const searchJiraAssigneesForUser = async (
  userId: UserId,
  params: { projectIdOrKey: string; query?: string }
): Promise<JiraUser[]> => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.searchAssignees(token, params);
};

export const getJiraIssuesForProject = async (
  userId: UserId,
  projectKey: string,
  cursor?: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getProjectIssues(token, projectKey, cursor);
};

export const getDetailsForIssue = async (
  userId: UserId,
  issueIdOrKey: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.getIssueDetails(token, issueIdOrKey);
};

export const deleteJiraIssue = async (
  userId: UserId,
  issueIdOrKey: string,
) => {
  const { adapter, token } = await createJiraAdapterForUser(userId);
  return adapter.deleteIssue(token, issueIdOrKey);
};