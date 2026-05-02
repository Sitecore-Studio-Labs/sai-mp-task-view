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
