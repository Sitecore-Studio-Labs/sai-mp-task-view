import type { ConnectionRecord, SaveConnectionParams, SessionRecord } from "./types";

/**
 * Platform-agnostic contract for token and session persistence.
 *
 * Every concrete implementation (Supabase, in-memory, Redis…) must satisfy
 * this interface. Route handlers and service adapters accept this interface so
 * the storage backend can be swapped without touching business logic.
 *
 * Usage in production:
 *   inject new SupabaseTokenStore(supabaseClient)
 *
 * Usage in tests:
 *   inject new MemoryTokenStore()
 */
export interface BaseTokenStore {
  // ── Connection ─────────────────────────────────────────────────────────────

  /**
   * Returns the active connection for `userId`, or `null` if none exists.
   * Implementations must decrypt stored tokens before returning.
   */
  getConnection(userId: string): Promise<ConnectionRecord | null>;

  /**
   * Upserts an active connection for the given user.
   * Implementations should encrypt tokens before persisting.
   * Returns the persisted `connectionId`.
   */
  saveConnection(params: SaveConnectionParams): Promise<string>;

  /**
   * Marks the connection identified by `connectionId` as inactive.
   * Used when tokens fail to refresh (auth error) or the user disconnects.
   */
  deactivateConnection(connectionId: string): Promise<void>;

  /**
   * Updates the active project key on the user's connection.
   * No-ops if no active connection exists.
   */
  updateProject(userId: string, projectKey: string): Promise<void>;

  // ── Sessions ───────────────────────────────────────────────────────────────

  /**
   * Creates a new session. Replaces any existing sessions for the same account.
   */
  createSession(accountId: string, sessionToken: string, expiresAt: Date): Promise<void>;

  /**
   * Looks up a session by its opaque token string.
   * Returns `null` if not found or already expired.
   */
  lookupSession(sessionToken: string): Promise<SessionRecord | null>;

  /**
   * Deletes all sessions belonging to `accountId`.
   */
  deleteSessionsForUser(accountId: string): Promise<void>;
}
