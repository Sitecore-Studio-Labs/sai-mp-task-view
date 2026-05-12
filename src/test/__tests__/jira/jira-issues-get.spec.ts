import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../../app/api/jira/issues/route";

vi.mock("@/helpers/jiraUserId", () => ({
  getJiraUserIdFromSession: vi.fn(),
}));

vi.mock("@/services/jiraService", () => ({
  getJiraIssuesForProject: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));

vi.mocked(getJiraIssuesForProject).mockRejectedValue(new JiraAuthError("Auth failed"));

vi.mock("@razroo/html-to-adf", () => ({
  default: {
    htmlToAdf: vi.fn().mockReturnValue({}),
  },
}));

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { getJiraIssuesForProject } from "@/services/jiraService";
import { JiraProjectIssuesResponse } from "@/types/jira";

describe("GET /api/jira", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(url: string) {
    return new NextRequest(url);
  }

  it("returns 404 if no Jira user session", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/jira?projectKey=TEST");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("No active Jira connection.");
  });

  it("returns 400 if projectKey is missing", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    const req = createRequest("http://localhost/api/jira");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing required query parameter: projectKey");
  });

  it("calls service and returns issues successfully", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    const mockResult: JiraProjectIssuesResponse = { issues: [], isLast: false };
    vi.mocked(getJiraIssuesForProject).mockResolvedValue(mockResult);

    const req = createRequest("http://localhost/api/jira?projectKey=TEST&cursor=abc");

    const res = await GET(req);
    const json = await res.json();

    expect(getJiraIssuesForProject).toHaveBeenCalledWith(
      "user-1",
      "TEST",
      "abc",
      undefined,
      undefined,
    );

    expect(res.status).toBe(200);
    expect(json).toEqual(mockResult);
  });

  it("parses filters correctly", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    vi.mocked(getJiraIssuesForProject).mockResolvedValue({
      issues: [],
      isLast: true,
    });

    const req = createRequest(
      "http://localhost/api/jira?projectKey=TEST&status=Done&status=In%20Progress&priority=High",
    );

    await GET(req);

    expect(getJiraIssuesForProject).toHaveBeenCalledWith(
      "user-1",
      "TEST",
      undefined,
      {
        status: ["Done", "In Progress"],
        priority: ["High"],
      },
      undefined,
    );
  });

  it("handles JiraAuthError and clears cookie", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    vi.mocked(getJiraIssuesForProject).mockRejectedValue(new JiraAuthError("Auth failed"));

    const req = createRequest("http://localhost/api/jira?projectKey=TEST");
    const res = await GET(req);

    expect(clearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
  });

  it("handles missing Jira connection error message", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    vi.mocked(getJiraIssuesForProject).mockRejectedValue(
      new Error("No active Jira connection found for user."),
    );

    const req = createRequest("http://localhost/api/jira?projectKey=TEST");
    const res = await GET(req);
    const json = await res.json();

    expect(clearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(json.error).toBe("No active Jira connection.");
  });

  it("handles generic errors", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    vi.mocked(getJiraIssuesForProject).mockRejectedValue(new Error("Something broke"));

    const req = createRequest("http://localhost/api/jira?projectKey=TEST");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to search issues.");
  });
});
