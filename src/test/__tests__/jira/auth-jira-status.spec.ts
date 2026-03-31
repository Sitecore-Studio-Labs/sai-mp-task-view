import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../../app/api/auth/jira/status/route";

vi.mock("@/helpers/jiraUserId", () => ({
  getJiraUserIdFromSession: vi.fn(),
}));

vi.mock("@/services/jiraService", () => ({
  hasUserJiraConnection: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));

vi.mock("@/exceptions/jiraErrors", () => ({
  JiraAuthError: class JiraAuthError extends Error {},
}));

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { hasUserJiraConnection } from "@/services/jiraService";

describe("GET /api/jira/status", () => {
  const mockRequest = {} as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connected false if no userId", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(json).toEqual({ connected: false });
  });

  it("returns connected true when connection exists", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(hasUserJiraConnection).mockResolvedValue(true);

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(json).toEqual({ connected: true });
  });

  it("returns connected false when connection does not exist", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(hasUserJiraConnection).mockResolvedValue(false);

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(json).toEqual({ connected: false });
  });

  it("handles JiraAuthError and clears cookie", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(hasUserJiraConnection).mockRejectedValue(new JiraAuthError("Unauthorized"));

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(clearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("handles 'No active Jira connection found for user.' error", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(hasUserJiraConnection).mockRejectedValue(
      new Error("No active Jira connection found for user."),
    );

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(clearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "No active Jira connection." });
  });

  it("handles unknown errors gracefully", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
    vi.mocked(hasUserJiraConnection).mockRejectedValue(new Error("Something unexpected"));

    const res = await GET(mockRequest);
    const json = await res.json();

    expect(json).toEqual({ connected: false });
  });
});
