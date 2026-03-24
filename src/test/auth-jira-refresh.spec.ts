import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/jiraService", () => ({
  refreshUserJiraToken: vi.fn(),
}));
vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));

import { POST } from "@/app/api/auth/jira/refresh/route";
import { refreshUserJiraToken } from "@/services/jiraService";
import { PlatformToken } from "@/types/platform";

const mockedRefreshUserJiraToken = vi.mocked(refreshUserJiraToken);

describe("POST /api/auth/jira/refresh", () => {
  it("returns 401 when no session", async () => {
    mockedRefreshUserJiraToken.mockRejectedValue(new Error("no session"));

    const req = {
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
      },
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Jira session has expired. Please reconnect Jira.",
    });
  });

  it("returns token when valid", async () => {
    const token: PlatformToken = {
      accessToken: "token",
      refreshToken: "refresh",
      expiry: "x",
      tokenType: "bearer",
    };
    mockedRefreshUserJiraToken.mockResolvedValue(token);

    const req = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: "user123" }),
      },
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(token);
  });
});
