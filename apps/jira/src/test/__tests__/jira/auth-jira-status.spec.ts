import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../../app/api/auth/jira/status/route";

vi.mock("@/helpers/jiraUserId", () => ({
  getJiraUserIdFromSession: vi.fn(),
}));

vi.mock("@/lib/authStrategy", () => ({
  authStrategy: {
    status: vi.fn(),
  },
}));

import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { authStrategy } from "@/lib/authStrategy";

describe("GET /api/auth/jira/status", () => {
  const mockRequest = {} as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connected false if no userId", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ connected: false });
    expect(authStrategy.status).not.toHaveBeenCalled();
  });

  it("returns connected true when authStrategy reports active connection", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(authStrategy.status).mockResolvedValue({ connected: true });

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(authStrategy.status).toHaveBeenCalledWith("user-1");
    expect(res.status).toBe(200);
    expect(json).toEqual({ connected: true });
  });

  it("returns connected false when authStrategy reports no connection", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(authStrategy.status).mockResolvedValue({ connected: false });

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(authStrategy.status).toHaveBeenCalledWith("user-1");
    expect(res.status).toBe(200);
    expect(json).toEqual({ connected: false });
  });
});
