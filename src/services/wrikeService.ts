import { PlatformAuthError } from "@/exceptions/platformErrors";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { WrikeAdapter } from "@/platforms/wrike/WrikeAdapter";
import type { PlatformToken } from "@/types/platform";
import { decrypt, encrypt } from "@/utils/encryption";

export type UserId = string;

/**
 * Until Phase 3 renames the tables, Wrike connections are stored in the same
 * `jira_connections` table with `jira_site` holding the Wrike host and a
 * convention that `jira_project` stores a Wrike folder ID.
 * After Phase 3, these will read from `platform_connections` with a `platform` column.
 */

export const getUserWrikeConnection = async (userId: UserId) => {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("jira_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    throw new Error("No active Wrike connection found for user.");
  }

  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = decrypt(data.access_token_encrypted);
    refreshToken = decrypt(data.refresh_token_encrypted);
  } catch {
    await supabase
      .from("jira_connections")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    throw new Error("No active Wrike connection found for user.");
  }

  const token: PlatformToken = {
    accessToken,
    refreshToken,
    expiry: data.expiry,
    tokenType: "bearer",
  };

  return {
    host: data.jira_site as string,
    projectId: data.jira_project as string,
    token,
    connectionId: data.id as string,
  };
};

export const saveUserWrikeConnection = async (params: {
  userId: UserId;
  host: string;
  projectId: string;
  token: PlatformToken;
}) => {
  const supabase = createSupabaseServerClient();
  const { userId, host, projectId, token } = params;

  const { data, error } = await supabase
    .from("jira_connections")
    .upsert(
      {
        user_id: userId,
        jira_site: host,
        jira_project: projectId,
        access_token_encrypted: encrypt(token.accessToken),
        refresh_token_encrypted: encrypt(token.refreshToken),
        expiry: token.expiry,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist Wrike connection: ${error?.message ?? "Unknown error"}`);
  }

  await supabase.from("sync_logs").insert({
    user_id: userId,
    jira_connection_id: data.id,
    action: "connection_updated",
    details: { host, platform: "wrike" },
  });

  return data;
};

export const disconnectUserWrike = async (userId: UserId): Promise<void> => {
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

  if (error) throw new Error(`Failed to disconnect Wrike: ${error.message}`);
  if (sessionError) throw new Error(`Failed to delete session: ${sessionError.message}`);
};

export const createWrikeAdapterForUser = async (userId: UserId) => {
  let connection = await getUserWrikeConnection(userId);

  const now = Date.now();
  const expiryTime = connection.token.expiry ? new Date(connection.token.expiry).getTime() : null;

  if (expiryTime !== null && expiryTime <= now + 60_000) {
    const refreshedToken = await refreshUserWrikeToken(userId);
    connection = { ...connection, token: refreshedToken };
  }

  if (!connection.host || connection.host.trim() === "") {
    throw new Error("No Wrike host configured. Please reconnect to Wrike.");
  }

  const adapter = new WrikeAdapter(connection.host);

  return {
    adapter,
    token: connection.token,
    connectionId: connection.connectionId,
    host: connection.host,
    projectId: connection.projectId,
  };
};

export const refreshUserWrikeToken = async (userId: UserId): Promise<PlatformToken> => {
  const supabase = createSupabaseServerClient();
  const connection = await getUserWrikeConnection(userId);
  const adapter = new WrikeAdapter(connection.host);

  try {
    const newToken = await adapter.refreshToken(connection.token);

    await saveUserWrikeConnection({
      userId,
      host: connection.host,
      projectId: connection.projectId,
      token: newToken,
    });

    await supabase.from("sync_logs").insert({
      user_id: userId,
      jira_connection_id: connection.connectionId,
      action: "token_refreshed",
      details: { platform: "wrike" },
    });

    return newToken;
  } catch (error) {
    const status =
      (error as { statusCode?: number }).statusCode ??
      (error as { response?: { status?: number } }).response?.status;

    if (status === 401 || status === 403) {
      await supabase
        .from("jira_connections")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", connection.connectionId);

      throw new PlatformAuthError("wrike");
    }

    throw error;
  }
};
