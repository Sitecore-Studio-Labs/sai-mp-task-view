import { decrypt, encrypt } from "@mp/shared";
import type { Pool, PoolClient } from "pg";

import type { BaseTokenStore } from "./BaseTokenStore";
import type {
  ConnectionRecord,
  SaveConnectionParams,
  SessionRecord,
  SessionStore,
  TokenStoreConfig,
} from "./types";

const JIRA_DEFAULTS: TokenStoreConfig = {
  connectionsTable: "jira_connections",
  sessionsTable: "jira_sessions",
  siteColumn: "jira_site",
  projectColumn: "jira_project",
  accountIdColumn: "jira_account_id",
};

/**
 * Quote a SQL identifier. Config values are trusted constants, but we still
 * reject anything that is not a plain unquoted ident to avoid interpolation bugs.
 */
export function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}

function toOptionalIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (typeof value === "string") return value;
  return String(value);
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(value as string);
}

/**
 * Postgres-backed token store.
 *
 * Accepts an injected Pool so the caller owns connection lifecycle
 * (via getPool() in apps) and tests can inject a mock.
 *
 * Pass a TokenStoreConfig to target platform-specific tables.
 * Defaults to the Jira table/column layout for backwards compatibility.
 */
export class PostgresTokenStore implements BaseTokenStore, SessionStore {
  private readonly cfg: TokenStoreConfig;
  private readonly connectionsTable: string;
  private readonly sessionsTable: string;
  private readonly siteColumn: string;
  private readonly projectColumn: string;
  private readonly accountIdColumn: string;

  constructor(
    private readonly pool: Pool,
    config: TokenStoreConfig = JIRA_DEFAULTS,
  ) {
    this.cfg = config;
    this.connectionsTable = quoteIdent(config.connectionsTable);
    this.sessionsTable = quoteIdent(config.sessionsTable);
    this.siteColumn = quoteIdent(config.siteColumn);
    this.projectColumn = quoteIdent(config.projectColumn);
    this.accountIdColumn = quoteIdent(config.accountIdColumn);
  }

  async getConnection(userId: string): Promise<ConnectionRecord | null> {
    const { rows } = await this.pool.query<Record<string, unknown>>(
      `SELECT * FROM ${this.connectionsTable} WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    );

    const data = rows[0];
    if (!data) return null;

    let accessToken: string;
    let refreshToken: string | undefined;
    try {
      accessToken = decrypt(data["access_token_encrypted"] as string);
      refreshToken = data["refresh_token_encrypted"]
        ? decrypt(data["refresh_token_encrypted"] as string)
        : undefined;
    } catch {
      // Tokens are unreadable (key rotation, corruption). Deactivate the row
      // so the user is prompted to reconnect rather than hitting a silent loop.
      await this.deactivateConnection(data["id"] as string);
      return null;
    }

    return {
      connectionId: data["id"] as string,
      userId: data["user_id"] as string,
      platformSite: data[this.cfg.siteColumn] as string,
      platformProject: data[this.cfg.projectColumn] as string,
      token: {
        accessToken,
        refreshToken,
        expiry: toOptionalIso(data["expiry"]),
        tokenType: "bearer",
      },
    };
  }

  async saveConnection(params: SaveConnectionParams): Promise<string> {
    const { userId, platformSite, platformProject, token } = params;
    const updatedAt = new Date().toISOString();

    try {
      const { rows } = await this.pool.query<{ id: string }>(
        `INSERT INTO ${this.connectionsTable} (
           user_id, ${this.siteColumn}, ${this.projectColumn},
           access_token_encrypted, refresh_token_encrypted, expiry, status, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
         ON CONFLICT (user_id) DO UPDATE SET
           ${this.siteColumn} = EXCLUDED.${this.siteColumn},
           ${this.projectColumn} = EXCLUDED.${this.projectColumn},
           access_token_encrypted = EXCLUDED.access_token_encrypted,
           refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
           expiry = EXCLUDED.expiry,
           status = 'active',
           updated_at = EXCLUDED.updated_at
         RETURNING id`,
        [
          userId,
          platformSite,
          platformProject,
          encrypt(token.accessToken),
          token.refreshToken ? encrypt(token.refreshToken) : null,
          token.expiry ?? null,
          updatedAt,
        ],
      );

      const id = rows[0]?.id;
      if (!id) {
        throw new Error("PostgresTokenStore.saveConnection failed: no id returned");
      }
      return id;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("PostgresTokenStore.saveConnection")) {
        throw err;
      }
      throw new Error(`PostgresTokenStore.saveConnection failed: ${errorMessage(err)}`);
    }
  }

  async deactivateConnection(connectionId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE ${this.connectionsTable} SET status = 'inactive', updated_at = $1 WHERE id = $2`,
        [new Date().toISOString(), connectionId],
      );
    } catch (err) {
      throw new Error(`PostgresTokenStore.deactivateConnection failed: ${errorMessage(err)}`);
    }
  }

  async updateProject(userId: string, projectKey: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE ${this.connectionsTable}
         SET ${this.projectColumn} = $1, updated_at = $2
         WHERE user_id = $3 AND status = 'active'`,
        [projectKey, new Date().toISOString(), userId],
      );
    } catch (err) {
      throw new Error(`PostgresTokenStore.updateProject failed: ${errorMessage(err)}`);
    }
  }

  async createSession(accountId: string, sessionToken: string, expiresAt: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await this.replaceSession(client, accountId, sessionToken, expiresAt);
    } finally {
      client.release();
    }
  }

  async lookupSession(sessionToken: string): Promise<SessionRecord | null> {
    const { rows } = await this.pool.query<Record<string, unknown>>(
      `SELECT * FROM ${this.sessionsTable} WHERE session_token = $1 LIMIT 1`,
      [sessionToken],
    );

    const data = rows[0];
    if (!data) return null;

    const expiresAt = toDate(data["expires_at"]);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) return null;

    return { accountId: data[this.cfg.accountIdColumn] as string, expiresAt };
  }

  async deleteSessionsForUser(accountId: string): Promise<void> {
    try {
      await this.pool.query(
        `DELETE FROM ${this.sessionsTable} WHERE ${this.accountIdColumn} = $1`,
        [accountId],
      );
    } catch (err) {
      throw new Error(`PostgresTokenStore.deleteSessionsForUser failed: ${errorMessage(err)}`);
    }
  }

  private async replaceSession(
    client: PoolClient,
    accountId: string,
    sessionToken: string,
    expiresAt: Date,
  ): Promise<void> {
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM ${this.sessionsTable} WHERE ${this.accountIdColumn} = $1`, [
        accountId,
      ]);
      await client.query(
        `INSERT INTO ${this.sessionsTable} (session_token, ${this.accountIdColumn}, expires_at)
         VALUES ($1, $2, $3)`,
        [sessionToken, accountId, expiresAt.toISOString()],
      );
      await client.query("COMMIT");
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Ignore rollback errors; the original failure is more useful.
      }
      throw new Error(`PostgresTokenStore.createSession failed: ${errorMessage(err)}`);
    }
  }
}
