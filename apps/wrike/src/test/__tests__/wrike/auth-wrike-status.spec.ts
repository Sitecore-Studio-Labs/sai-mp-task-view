import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../../app/api/auth/wrike/status/route";

vi.mock("@/helpers/wrikeUserId", () => ({
  getWrikeUserIdFromSession: vi.fn(),
}));

vi.mock("@/lib/authStrategy", () => ({
  authStrategy: {
    status: vi.fn(),
  },
}));

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { authStrategy } from "@/lib/authStrategy";

describe("GET /api/auth/wrike/status", () => {
  const mockRequest = {} as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connected false if no userId", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ connected: false });
    expect(authStrategy.status).not.toHaveBeenCalled();
  });

  it("returns connected true when authStrategy reports active connection", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(authStrategy.status).mockResolvedValue({ connected: true });

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(authStrategy.status).toHaveBeenCalledWith("user-1");
    expect(res.status).toBe(200);
    expect(json).toEqual({ connected: true });
  });

  it("returns connected false when authStrategy reports no connection", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(authStrategy.status).mockResolvedValue({ connected: false });

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(authStrategy.status).toHaveBeenCalledWith("user-1");
    expect(res.status).toBe(200);
    expect(json).toEqual({ connected: false });
  });
});
