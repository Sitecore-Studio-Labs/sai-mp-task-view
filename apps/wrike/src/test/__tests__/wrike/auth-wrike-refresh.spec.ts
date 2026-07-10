import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../../../app/api/auth/wrike/refresh/route";

vi.mock("@/helpers/wrikeUserId", () => ({
  getWrikeUserIdFromSession: vi.fn(),
}));

vi.mock("@/lib/authStrategy", () => ({
  authStrategy: {
    getValidToken: vi.fn(),
  },
}));

vi.mock("@mp/shared", () => ({
  rateLimit: vi.fn(() => ({ allowed: true, retryAfter: 0 })),
}));

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { authStrategy } from "@/lib/authStrategy";

describe("POST /api/auth/wrike/refresh", () => {
  const mockRequest = {} as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if no userId", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);

    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Not authenticated");
  });

  it("returns ok when token refresh succeeds", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(authStrategy.getValidToken).mockResolvedValue({
      accessToken: "token",
      refreshToken: "refresh",
      tokenType: "bearer",
      expiry: `${Date.now() + 3600 * 1000}`,
    });

    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(authStrategy.getValidToken).toHaveBeenCalledWith("user-1");
  });
});
