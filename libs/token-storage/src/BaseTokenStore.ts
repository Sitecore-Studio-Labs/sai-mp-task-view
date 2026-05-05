import type { ConnectionRecord, SaveConnectionParams } from "./types";

/**
 * Platform-agnostic contract for connection persistence.
 *
 * This is the interface auth strategies depend on — only the four methods
 * needed to read, write, deactivate, and update a connection.
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
}
