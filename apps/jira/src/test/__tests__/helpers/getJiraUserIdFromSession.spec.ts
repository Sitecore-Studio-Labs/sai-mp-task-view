import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

function createRequestWithCookie(token?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/test");
  if (token !== undefined) {
    req.cookies.set("jira_session_token", token);
  }
  return req;
}

function mockSupabaseQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as never);
}

describe("getJiraUserIdFromSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no jira_session_token cookie is present", async () => {
    const req = new NextRequest("http://localhost/api/test");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
  });

  it("returns null when cookie value is empty string", async () => {
    const req = createRequestWithCookie("");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
  });

  it("returns null when no matching session row exists in database", async () => {
    mockSupabaseQuery({ data: null, error: null });
    const req = createRequestWithCookie("nonexistent-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
  });

  it("returns null when database query returns an error", async () => {
    mockSupabaseQuery({ data: null, error: { message: "DB connection failed" } });
    const req = createRequestWithCookie("valid-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
  });

  it("returns null when session has expired", async () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString();
    mockSupabaseQuery({
      data: { jira_account_id: "user-123", expires_at: pastDate },
      error: null,
    });
    const req = createRequestWithCookie("expired-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
  });

  it("returns null when expires_at is an invalid date format", async () => {
    mockSupabaseQuery({
      data: { jira_account_id: "user-123", expires_at: "not-a-date" },
      error: null,
    });
    const req = createRequestWithCookie("bad-date-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
  });

  it("returns jira_account_id for a valid, non-expired session", async () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    mockSupabaseQuery({
      data: { jira_account_id: "user-abc-123", expires_at: futureDate },
      error: null,
    });
    const req = createRequestWithCookie("valid-session-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBe("user-abc-123");
  });

  it("queries the correct table and column", async () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { jira_account_id: "user-1", expires_at: futureDate },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as never);

    const req = createRequestWithCookie("my-token");
    await getJiraUserIdFromSession(req);

    expect(from).toHaveBeenCalledWith("jira_sessions");
    expect(select).toHaveBeenCalledWith("jira_account_id, expires_at");
    expect(eq).toHaveBeenCalledWith("session_token", "my-token");
  });
});
