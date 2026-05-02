import type { BaseTokenStore } from "./BaseTokenStore";
import type { ConnectionRecord, SaveConnectionParams, SessionRecord } from "./types";

interface StoredSession {
  accountId: string;
  token: string;
  expiresAt: Date;
}

/**
 * In-memory token store for tests.
 *
 * Pre-seed it before creating an adapter under test:
 *
 *   const store = new MemoryTokenStore();
 *   store.seed({
 *     userId: "user-1",
 *     platformSite: "abc123",
 *     platformProject: "TEST",
 *     token: { accessToken: "tok", refreshToken: "ref", expiry: "2099-01-01T00:00:00Z", tokenType: "bearer" },
 *   });
 *   const adapter = new JiraServiceAdapter("user-1", store);
 */
export class MemoryTokenStore implements BaseTokenStore {
  private connections = new Map<string, ConnectionRecord & { userId: string }>();
  private sessions = new Map<string, StoredSession>();
  private idCounter = 0;

  seed(params: SaveConnectionParams & { connectionId?: string }): ConnectionRecord {
    const connectionId = params.connectionId ?? `conn-${++this.idCounter}`;
    const record: ConnectionRecord = {
      connectionId,
      userId: params.userId,
      platformSite: params.platformSite,
      platformProject: params.platformProject,
      token: { ...params.token },
    };
    this.connections.set(params.userId, { ...record, userId: params.userId });
    return record;
  }

  async getConnection(userId: string): Promise<ConnectionRecord | null> {
    return this.connections.get(userId) ?? null;
  }

  async saveConnection(params: SaveConnectionParams): Promise<string> {
    const connectionId = `conn-${++this.idCounter}`;
    this.connections.set(params.userId, {
      connectionId,
      userId: params.userId,
      platformSite: params.platformSite,
      platformProject: params.platformProject,
      token: { ...params.token },
    });
    return connectionId;
  }

  async deactivateConnection(connectionId: string): Promise<void> {
    for (const [userId, record] of this.connections.entries()) {
      if (record.connectionId === connectionId) {
        this.connections.delete(userId);
        break;
      }
    }
  }

  async updateProject(userId: string, projectKey: string): Promise<void> {
    const record = this.connections.get(userId);
    if (record) {
      record.platformProject = projectKey;
    }
  }

  async createSession(accountId: string, sessionToken: string, expiresAt: Date): Promise<void> {
    this.deleteSessionsForUser(accountId);
    this.sessions.set(sessionToken, { accountId, token: sessionToken, expiresAt });
  }

  async lookupSession(sessionToken: string): Promise<SessionRecord | null> {
    const session = this.sessions.get(sessionToken);
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(sessionToken);
      return null;
    }
    return { accountId: session.accountId, expiresAt: session.expiresAt };
  }

  async deleteSessionsForUser(accountId: string): Promise<void> {
    for (const [token, session] of this.sessions.entries()) {
      if (session.accountId === accountId) {
        this.sessions.delete(token);
      }
    }
  }

  /** Test helper: returns all connection records. */
  allConnections(): ConnectionRecord[] {
    return Array.from(this.connections.values());
  }

  /** Test helper: returns all session records. */
  allSessions(): StoredSession[] {
    return Array.from(this.sessions.values());
  }
}
