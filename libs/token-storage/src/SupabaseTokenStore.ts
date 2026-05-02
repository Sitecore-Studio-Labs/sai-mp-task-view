import { decrypt, encrypt } from "@mp/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BaseTokenStore } from "./BaseTokenStore";
import type { ConnectionRecord, SaveConnectionParams, SessionRecord } from "./types";

/**
 * Supabase-backed token store.
 *
 * Accepts an injected SupabaseClient so the caller controls which key
 * (anon vs service-role) is used — and so tests can inject a mock client.
 *
 * Table contracts:
 *   jira_connections  — user_id, jira_site, jira_project, access_token_encrypted,
 *                       refresh_token_encrypted, expiry, status, updated_at
 *   jira_sessions     — session_token, jira_account_id, expires_at
 */
export class SupabaseTokenStore implements BaseTokenStore {
  constructor(private readonly db: SupabaseClient) {}

  async getConnection(userId: string): Promise<ConnectionRecord | null> {
    const { data, error } = await this.db
      .from("jira_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error || !data) return null;

    let accessToken: string;
    let refreshToken: string;
    try {
      accessToken = decrypt(data.access_token_encrypted as string);
      refreshToken = decrypt(data.refresh_token_encrypted as string);
    } catch {
      // Tokens are unreadable (key rotation, corruption). Deactivate the row
      // so the user is prompted to reconnect rather than hitting a silent loop.
      await this.deactivateConnection(data.id as string);
      return null;
    }

    return {
      connectionId: data.id as string,
      userId: data.user_id as string,
      platformSite: data.jira_site as string,
      platformProject: data.jira_project as string,
      token: {
        accessToken,
        refreshToken,
        expiry: data.expiry as string,
        tokenType: "bearer",
      },
    };
  }

  async saveConnection(params: SaveConnectionParams): Promise<string> {
    const { userId, platformSite, platformProject, token } = params;

    const { data, error } = await this.db
      .from("jira_connections")
      .upsert(
        {
          user_id: userId,
          jira_site: platformSite,
          jira_project: platformProject,
          access_token_encrypted: encrypt(token.accessToken),
          refresh_token_encrypted: encrypt(token.refreshToken),
          expiry: token.expiry,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        `SupabaseTokenStore.saveConnection failed: ${error?.message ?? "unknown error"}`,
      );
    }

    return data.id as string;
  }

  async deactivateConnection(connectionId: string): Promise<void> {
    const { error } = await this.db
      .from("jira_connections")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", connectionId);

    if (error) {
      throw new Error(`SupabaseTokenStore.deactivateConnection failed: ${error.message}`);
    }
  }

  async updateProject(userId: string, projectKey: string): Promise<void> {
    const { error } = await this.db
      .from("jira_connections")
      .update({ jira_project: projectKey, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      throw new Error(`SupabaseTokenStore.updateProject failed: ${error.message}`);
    }
  }

  async createSession(accountId: string, sessionToken: string, expiresAt: Date): Promise<void> {
    // Replace any existing session for this account to prevent orphaned rows.
    await this.db.from("jira_sessions").delete().eq("jira_account_id", accountId);

    const { error } = await this.db.from("jira_sessions").insert({
      session_token: sessionToken,
      jira_account_id: accountId,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      throw new Error(`SupabaseTokenStore.createSession failed: ${error.message}`);
    }
  }

  async lookupSession(sessionToken: string): Promise<SessionRecord | null> {
    const { data, error } = await this.db
      .from("jira_sessions")
      .select("jira_account_id, expires_at")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at as string);
    if (isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) return null;

    return { accountId: data.jira_account_id as string, expiresAt };
  }

  async deleteSessionsForUser(accountId: string): Promise<void> {
    const { error } = await this.db.from("jira_sessions").delete().eq("jira_account_id", accountId);

    if (error) {
      throw new Error(`SupabaseTokenStore.deleteSessionsForUser failed: ${error.message}`);
    }
  }
}
