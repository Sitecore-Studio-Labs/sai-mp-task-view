import type { ConnectionRecord, StoredToken } from "@mp/token-storage";

import type { TokenSet } from "../types";

/**
 * Shared helpers for all concrete strategy implementations.
 * Does not implement AuthStrategy — subclasses do.
 */
export abstract class BaseAuthStrategy {
  protected tokenSetToStored(ts: TokenSet): StoredToken {
    return {
      accessToken: ts.accessToken,
      refreshToken: ts.refreshToken ?? "",
      expiry: ts.expiresAt ? new Date(ts.expiresAt).toISOString() : "",
      tokenType: "bearer",
    };
  }

  protected storedToTokenSet(s: StoredToken): TokenSet {
    return {
      accessToken: s.accessToken,
      refreshToken: s.refreshToken || undefined,
      expiresAt: s.expiry ? new Date(s.expiry).getTime() : undefined,
      tokenType: s.tokenType,
    };
  }

  protected isExpired(ts: TokenSet, bufferMs = 60_000): boolean {
    if (ts.expiresAt == null) return false;
    return ts.expiresAt - bufferMs < Date.now();
  }

  protected connectionToTokenSet(conn: ConnectionRecord): TokenSet {
    return this.storedToTokenSet(conn.token);
  }
}
