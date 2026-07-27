import { PlatformToken } from "@mp/task-core";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { refreshUserJiraToken } from "@/services/jiraService";

import { POST } from "../../../app/api/auth/jira/refresh/route";

vi.mock("@/helpers/jiraUserId");
vi.mock("@/services/jiraService");
vi.mock("@/helpers/cookies");

describe("POST /api/jira/refresh", () => {
  const mockRequest = {} as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if no userId", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);

    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("No active Jira connection.");
  });

  it("should return new token on success", async () => {
    const fakeToken: PlatformToken = {
      accessToken: "new-token",
      refreshToken: "refresh-token",
      tokenType: "bearer",
      expiry: `${Date.now() + 3600 * 1000}`,
    };

    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("refresh-token");
    vi.mocked(refreshUserJiraToken).mockResolvedValue(fakeToken);

    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(fakeToken);
    expect(refreshUserJiraToken).toHaveBeenCalledWith("refresh-token");
  });

  it("should handle JiraAuthError and clear cookie", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-123");
    vi.mocked(refreshUserJiraToken).mockRejectedValue(new JiraAuthError("Invalid token"));

    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid token");
    expect(clearJiraCookie).toHaveBeenCalled();
  });

  it("should handle unknown errors and clear cookie", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-123");
    vi.mocked(refreshUserJiraToken).mockRejectedValue(new Error("Something broke"));

    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Jira session has expired. Please reconnect Jira.");
    expect(clearJiraCookie).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
