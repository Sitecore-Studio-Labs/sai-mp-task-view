import { decrypt, encrypt } from "@mp/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BaseTokenStore } from "./BaseTokenStore";
import type {
  ConnectionRecord,
  SaveConnectionParams,
  SessionRecord,
  SessionStore,
  SupabaseTokenStoreConfig,
} from "./types";

const JIRA_DEFAULTS: SupabaseTokenStoreConfig = {
  connectionsTable: "jira_connections",
  sessionsTable: "jira_sessions",
  siteColumn: "jira_site",
  projectColumn: "jira_project",
  accountIdColumn: "jira_account_id",
};

/**
 * Supabase-backed token store.
 *
 * Accepts an injected SupabaseClient so the caller controls which key
 * (anon vs service-role) is used — and so tests can inject a mock client.
 *
 * Pass a SupabaseTokenStoreConfig to target platform-specific tables.
 * Defaults to the Jira table/column layout for backwards compatibility.
 */
export class SupabaseTokenStore implements BaseTokenStore, SessionStore {
  private readonly cfg: SupabaseTokenStoreConfig;

  constructor(
    private readonly db: SupabaseClient,
    config: SupabaseTokenStoreConfig = JIRA_DEFAULTS,
  ) {
    this.cfg = config;
  }

  async getConnection(userId: string): Promise<ConnectionRecord | null> {
    const { data, error } = await this.db
      .from(this.cfg.connectionsTable)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error || !data) return null;

    let accessToken: string;
    let refreshToken: string | undefined;
    try {
      accessToken = decrypt(data.access_token_encrypted as string);
      refreshToken = data.refresh_token_encrypted
        ? decrypt(data.refresh_token_encrypted as string)
        : undefined;
    } catch {
      // Tokens are unreadable (key rotation, corruption). Deactivate the row
      // so the user is prompted to reconnect rather than hitting a silent loop.
      await this.deactivateConnection(data.id as string);
      return null;
    }

    return {
      connectionId: data.id as string,
      userId: data.user_id as string,
      platformSite: data[this.cfg.siteColumn] as string,
      platformProject: data[this.cfg.projectColumn] as string,
      token: {
        accessToken,
        refreshToken,
        expiry: (data.expiry as string | null) ?? undefined,
        tokenType: "bearer",
      },
    };
  }

  async saveConnection(params: SaveConnectionParams): Promise<string> {
    const { userId, platformSite, platformProject, token } = params;

    const { data, error } = await this.db
      .from(this.cfg.connectionsTable)
      .upsert(
        {
          user_id: userId,
          [this.cfg.siteColumn]: platformSite,
          [this.cfg.projectColumn]: platformProject,
          access_token_encrypted: encrypt(token.accessToken),
          refresh_token_encrypted: token.refreshToken ? encrypt(token.refreshToken) : null,
          expiry: token.expiry ?? null,
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
      .from(this.cfg.connectionsTable)
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", connectionId);

    if (error) {
      throw new Error(`SupabaseTokenStore.deactivateConnection failed: ${error.message}`);
    }
  }

  async updateProject(userId: string, projectKey: string): Promise<void> {
    const { error } = await this.db
      .from(this.cfg.connectionsTable)
      .update({ [this.cfg.projectColumn]: projectKey, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      throw new Error(`SupabaseTokenStore.updateProject failed: ${error.message}`);
    }
  }

  async createSession(accountId: string, sessionToken: string, expiresAt: Date): Promise<void> {
    // Replace any existing session for this account to prevent orphaned rows.
    await this.db.from(this.cfg.sessionsTable).delete().eq(this.cfg.accountIdColumn, accountId);

    const { error } = await this.db.from(this.cfg.sessionsTable).insert({
      session_token: sessionToken,
      [this.cfg.accountIdColumn]: accountId,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      throw new Error(`SupabaseTokenStore.createSession failed: ${error.message}`);
    }
  }

  async lookupSession(sessionToken: string): Promise<SessionRecord | null> {
    const { data, error } = await this.db
      .from(this.cfg.sessionsTable)
      .select("*")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;
    const expiresAt = new Date(row["expires_at"] as string);
    if (isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) return null;

    return { accountId: row[this.cfg.accountIdColumn] as string, expiresAt };
  }

  async deleteSessionsForUser(accountId: string): Promise<void> {
    const { error } = await this.db
      .from(this.cfg.sessionsTable)
      .delete()
      .eq(this.cfg.accountIdColumn, accountId);

    if (error) {
      throw new Error(`SupabaseTokenStore.deleteSessionsForUser failed: ${error.message}`);
    }
  }
}
