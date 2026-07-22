import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  createSupabaseServerClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@mp/token-storage", () => ({
  SupabaseTokenStore: vi.fn().mockImplementation(() => ({
    lookupSession,
  })),
}));

import { WRIKE_SESSION_COOKIE } from "@/helpers/cookies";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";

function createRequestWithCookie(token?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/test");
  if (token !== undefined) {
    req.cookies.set(WRIKE_SESSION_COOKIE, token);
  }
  return req;
}

describe("getWrikeUserIdFromSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no wrike_session cookie is present", async () => {
    const req = new NextRequest("http://localhost/api/test");
    const result = await getWrikeUserIdFromSession(req);
    expect(result).toBeNull();
    expect(lookupSession).not.toHaveBeenCalled();
  });

  it("returns null when cookie value is empty string", async () => {
    const req = createRequestWithCookie("");
    const result = await getWrikeUserIdFromSession(req);
    expect(result).toBeNull();
    expect(lookupSession).not.toHaveBeenCalled();
  });

  it("returns null when no matching session exists", async () => {
    lookupSession.mockResolvedValue(null);
    const req = createRequestWithCookie("nonexistent-token");
    const result = await getWrikeUserIdFromSession(req);
    expect(result).toBeNull();
    expect(lookupSession).toHaveBeenCalledWith("nonexistent-token");
  });

  it("returns accountId for a valid session", async () => {
    lookupSession.mockResolvedValue({
      accountId: "user-abc-123",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const req = createRequestWithCookie("valid-session-token");
    const result = await getWrikeUserIdFromSession(req);
    expect(result).toBe("user-abc-123");
    expect(lookupSession).toHaveBeenCalledWith("valid-session-token");
  });
});
