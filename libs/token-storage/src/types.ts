/**
 * Column/table names for SupabaseTokenStore.
 * Pass to the constructor to support non-Jira platforms.
 */
export interface SupabaseTokenStoreConfig {
  connectionsTable: string;
  sessionsTable: string;
  siteColumn: string;
  projectColumn: string;
  accountIdColumn: string;
}

/**
 * Stored token credentials — mirrors PlatformToken from @mp/task-core
 * but kept local so this lib has no dependency on type:feature peers.
 */
export interface StoredToken {
  accessToken: string;
  /** Absent for oauth2-static, oauth1, and api-key connections. */
  refreshToken?: string;
  /** ISO timestamp of when the access token expires. Empty string or absent for non-expiring tokens. */
  expiry?: string;
  tokenType: "bearer";
}

/** A resolved connection record returned by the store. */
export interface ConnectionRecord {
  connectionId: string;
  userId: string;
  platformSite: string;
  platformProject: string;
  token: StoredToken;
}

/** Parameters for upserting a connection. */
export interface SaveConnectionParams {
  userId: string;
  platformSite: string;
  platformProject: string;
  token: StoredToken;
}

/** A resolved session record returned by the store. */
export interface SessionRecord {
  /** The platform account ID associated with this session. */
  accountId: string;
  expiresAt: Date;
}

/**
 * Optional session-management contract for platforms that use server-side
 * cookie sessions (e.g. Jira). Auth strategies do not depend on this —
 * only platform-specific callback/session routes need it.
 */
export interface SessionStore {
  /** Creates a new session. Replaces any existing sessions for the same account. */
  createSession(accountId: string, sessionToken: string, expiresAt: Date): Promise<void>;

  /**
   * Looks up a session by its opaque token string.
   * Returns `null` if not found or already expired.
   */
  lookupSession(sessionToken: string): Promise<SessionRecord | null>;

  /** Deletes all sessions belonging to `accountId`. */
  deleteSessionsForUser(accountId: string): Promise<void>;
}
