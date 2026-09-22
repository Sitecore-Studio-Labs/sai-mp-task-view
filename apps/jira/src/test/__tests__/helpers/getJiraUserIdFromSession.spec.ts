import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/tokenStore", () => ({
  createJiraTokenStore: vi.fn().mockImplementation(() => ({
    lookupSession,
  })),
}));

import { JIRA_SESSION_COOKIE } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";

function createRequestWithCookie(token?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/test");
  if (token !== undefined) {
    req.cookies.set(JIRA_SESSION_COOKIE, token);
  }
  return req;
}

describe("getJiraUserIdFromSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no jira_session_token cookie is present", async () => {
    const req = new NextRequest("http://localhost/api/test");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
    expect(lookupSession).not.toHaveBeenCalled();
  });

  it("returns null when cookie value is empty string", async () => {
    const req = createRequestWithCookie("");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
    expect(lookupSession).not.toHaveBeenCalled();
  });

  it("returns null when no matching session exists", async () => {
    lookupSession.mockResolvedValue(null);
    const req = createRequestWithCookie("nonexistent-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
    expect(lookupSession).toHaveBeenCalledWith("nonexistent-token");
  });

  it("returns null when lookupSession throws", async () => {
    lookupSession.mockRejectedValue(new Error("DB connection failed"));
    const req = createRequestWithCookie("valid-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
  });

  it("returns null when the store reports an expired session", async () => {
    lookupSession.mockResolvedValue(null);
    const req = createRequestWithCookie("expired-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBeNull();
  });

  it("returns accountId for a valid session", async () => {
    lookupSession.mockResolvedValue({
      accountId: "user-abc-123",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const req = createRequestWithCookie("valid-session-token");
    const result = await getJiraUserIdFromSession(req);
    expect(result).toBe("user-abc-123");
    expect(lookupSession).toHaveBeenCalledWith("valid-session-token");
  });
});
