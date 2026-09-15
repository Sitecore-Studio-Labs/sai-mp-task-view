import type { Pool, PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@mp/shared", () => ({
  encrypt: vi.fn((value: string) => `enc:${value}`),
  decrypt: vi.fn((value: string) => {
    if (typeof value === "string" && value.startsWith("enc:")) return value.slice(4);
    throw new Error("bad cipher");
  }),
}));

import { decrypt, encrypt } from "@mp/shared";

import { PostgresTokenStore, quoteIdent } from "../PostgresTokenStore";

const WRIKE_CONFIG = {
  connectionsTable: "wrike_connections",
  sessionsTable: "wrike_sessions",
  siteColumn: "wrike_site",
  projectColumn: "wrike_project",
  accountIdColumn: "wrike_account_id",
};

function createPool(
  overrides: { query?: ReturnType<typeof vi.fn>; connect?: ReturnType<typeof vi.fn> } = {},
) {
  const query = overrides.query ?? vi.fn();
  const connect = overrides.connect ?? vi.fn();
  return { query, connect, pool: { query, connect } as unknown as Pool };
}

describe("quoteIdent", () => {
  it("quotes a plain identifier", () => {
    expect(quoteIdent("jira_connections")).toBe('"jira_connections"');
  });

  it("rejects identifiers that cannot be interpolated safely", () => {
    expect(() => quoteIdent('jira"; drop table')).toThrow("Invalid SQL identifier");
  });
});

describe("PostgresTokenStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encrypt).mockImplementation((value: string) => `enc:${value}`);
    vi.mocked(decrypt).mockImplementation((value: string) => {
      if (typeof value === "string" && value.startsWith("enc:")) return value.slice(4);
      throw new Error("bad cipher");
    });
  });

  describe("getConnection", () => {
    it("returns a decrypted connection for an active row", async () => {
      const { query, pool } = createPool();
      query.mockResolvedValue({
        rows: [
          {
            id: "conn-1",
            user_id: "user-1",
            jira_site: "cloud-1",
            jira_project: "TEST",
            access_token_encrypted: "enc:access",
            refresh_token_encrypted: "enc:refresh",
            expiry: "2099-01-01T00:00:00.000Z",
          },
        ],
      });

      const store = new PostgresTokenStore(pool);
      const connection = await store.getConnection("user-1");

      expect(query.mock.calls[0]?.[0]).toContain('FROM "jira_connections"');
      expect(query.mock.calls[0]?.[0]).toContain("user_id = $1 AND status = 'active' LIMIT 1");
      expect(query.mock.calls[0]?.[1]).toEqual(["user-1"]);
      expect(decrypt).toHaveBeenCalledWith("enc:access");
      expect(connection).toEqual({
        connectionId: "conn-1",
        userId: "user-1",
        platformSite: "cloud-1",
        platformProject: "TEST",
        token: {
          accessToken: "access",
          refreshToken: "refresh",
          expiry: "2099-01-01T00:00:00.000Z",
          tokenType: "bearer",
        },
      });
    });

    it("deactivates the row and returns null when decrypt fails", async () => {
      const { query, pool } = createPool();
      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "conn-bad",
              user_id: "user-1",
              jira_site: "cloud-1",
              jira_project: "TEST",
              access_token_encrypted: "corrupt",
              refresh_token_encrypted: null,
              expiry: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const store = new PostgresTokenStore(pool);
      const connection = await store.getConnection("user-1");

      expect(connection).toBeNull();
      expect(query.mock.calls[1]?.[0]).toContain("status = 'inactive'");
      expect(query.mock.calls[1]?.[0]).toContain("updated_at");
      expect(query.mock.calls[1]?.[1]?.[1]).toBe("conn-bad");
    });

    it("returns null when no active row exists", async () => {
      const { query, pool } = createPool();
      query.mockResolvedValue({ rows: [] });

      const store = new PostgresTokenStore(pool);
      await expect(store.getConnection("missing")).resolves.toBeNull();
    });
  });

  describe("saveConnection", () => {
    it("encrypts tokens and upserts with status active", async () => {
      const { query, pool } = createPool();
      query.mockResolvedValue({ rows: [{ id: "conn-2" }] });

      const store = new PostgresTokenStore(pool, WRIKE_CONFIG);
      const id = await store.saveConnection({
        userId: "user-1",
        platformSite: "https://app-us2.wrike.com",
        platformProject: "folder-1",
        token: {
          accessToken: "access",
          refreshToken: "refresh",
          expiry: "2099-01-01T00:00:00.000Z",
          tokenType: "bearer",
        },
      });

      expect(id).toBe("conn-2");
      expect(encrypt).toHaveBeenCalledWith("access");
      expect(encrypt).toHaveBeenCalledWith("refresh");

      const [sql, params] = query.mock.calls[0] ?? [];
      expect(sql).toContain('INSERT INTO "wrike_connections"');
      expect(sql).toContain("ON CONFLICT (user_id) DO UPDATE SET");
      expect(sql).toContain("status = 'active'");
      expect(sql).toContain("RETURNING id");
      expect(params?.[0]).toBe("user-1");
      expect(params?.[3]).toBe("enc:access");
      expect(params?.[4]).toBe("enc:refresh");
    });

    it("writes null for a missing refresh token", async () => {
      const { query, pool } = createPool();
      query.mockResolvedValue({ rows: [{ id: "conn-3" }] });

      const store = new PostgresTokenStore(pool);
      await store.saveConnection({
        userId: "user-1",
        platformSite: "cloud-1",
        platformProject: "TEST",
        token: { accessToken: "access", tokenType: "bearer" },
      });

      expect(query.mock.calls[0]?.[1]?.[4]).toBeNull();
    });
  });

  describe("createSession", () => {
    it("deletes existing sessions then inserts inside a transaction", async () => {
      const clientQuery = vi.fn().mockResolvedValue({ rows: [] });
      const release = vi.fn();
      const { connect, pool } = createPool({
        connect: vi.fn().mockResolvedValue({
          query: clientQuery,
          release,
        } satisfies Partial<PoolClient>),
      });

      const store = new PostgresTokenStore(pool, WRIKE_CONFIG);
      const expiresAt = new Date("2099-01-01T00:00:00.000Z");
      await store.createSession("acct-1", "sess-token", expiresAt);

      expect(connect).toHaveBeenCalledOnce();
      expect(clientQuery.mock.calls.map((call) => call[0])).toEqual([
        "BEGIN",
        expect.stringContaining('DELETE FROM "wrike_sessions"'),
        expect.stringContaining('INSERT INTO "wrike_sessions"'),
        "COMMIT",
      ]);
      expect(clientQuery.mock.calls[1]?.[1]).toEqual(["acct-1"]);
      expect(clientQuery.mock.calls[2]?.[1]).toEqual([
        "sess-token",
        "acct-1",
        expiresAt.toISOString(),
      ]);
      expect(release).toHaveBeenCalledOnce();
    });

    it("rolls back and wraps errors", async () => {
      const clientQuery = vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("insert failed"))
        .mockResolvedValueOnce({ rows: [] });
      const release = vi.fn();
      const { pool } = createPool({
        connect: vi.fn().mockResolvedValue({ query: clientQuery, release }),
      });

      const store = new PostgresTokenStore(pool);
      await expect(store.createSession("acct-1", "tok", new Date())).rejects.toThrow(
        "PostgresTokenStore.createSession failed: insert failed",
      );
      expect(clientQuery.mock.calls.map((call) => call[0])).toContain("ROLLBACK");
      expect(release).toHaveBeenCalledOnce();
    });
  });

  describe("lookupSession", () => {
    it("returns the account when the session is still valid", async () => {
      const { query, pool } = createPool();
      query.mockResolvedValue({
        rows: [
          {
            session_token: "tok",
            jira_account_id: "acct-1",
            expires_at: new Date(Date.now() + 60_000),
          },
        ],
      });

      const store = new PostgresTokenStore(pool);
      const session = await store.lookupSession("tok");

      expect(query.mock.calls[0]?.[0]).toContain('FROM "jira_sessions"');
      expect(query.mock.calls[0]?.[0]).toContain("session_token = $1");
      expect(session?.accountId).toBe("acct-1");
    });

    it("returns null when the session is expired", async () => {
      const { query, pool } = createPool();
      query.mockResolvedValue({
        rows: [
          {
            session_token: "tok",
            jira_account_id: "acct-1",
            expires_at: new Date(Date.now() - 1000),
          },
        ],
      });

      const store = new PostgresTokenStore(pool);
      await expect(store.lookupSession("tok")).resolves.toBeNull();
    });
  });

  describe("deleteSessionsForUser and updateProject", () => {
    it("deletes sessions by the platform account column", async () => {
      const { query, pool } = createPool();
      query.mockResolvedValue({ rows: [] });

      const store = new PostgresTokenStore(pool, WRIKE_CONFIG);
      await store.deleteSessionsForUser("acct-1");

      expect(query.mock.calls[0]?.[0]).toContain('DELETE FROM "wrike_sessions"');
      expect(query.mock.calls[0]?.[0]).toContain('"wrike_account_id" = $1');
      expect(query.mock.calls[0]?.[1]).toEqual(["acct-1"]);
    });

    it("updates the active project column", async () => {
      const { query, pool } = createPool();
      query.mockResolvedValue({ rows: [] });

      const store = new PostgresTokenStore(pool, WRIKE_CONFIG);
      await store.updateProject("user-1", "folder-9");

      expect(query.mock.calls[0]?.[0]).toContain('"wrike_project" = $1');
      expect(query.mock.calls[0]?.[0]).toContain("updated_at");
      expect(query.mock.calls[0]?.[0]).toContain("status = 'active'");
      expect(query.mock.calls[0]?.[1]?.[0]).toBe("folder-9");
      expect(query.mock.calls[0]?.[1]?.[2]).toBe("user-1");
    });
  });
});
