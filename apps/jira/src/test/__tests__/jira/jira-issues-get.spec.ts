import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../../app/api/jira/issues/route";
import { jiraAdapterMocks } from "../../helpers/mockJiraServiceAdapter";

vi.mock("@/helpers/jiraUserId", () => ({
  getJiraUserIdFromSession: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));

vi.mock("@razroo/html-to-adf", () => ({
  default: {
    htmlToAdf: vi.fn().mockReturnValue({}),
  },
}));

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";

describe("GET /api/jira", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(url: string) {
    return new NextRequest(url);
  }

  it("returns 401 if no Jira user session", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/jira?projectKey=TEST");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
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

  it("calls adapter and returns issues successfully", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    const mockResult = { issues: [], isLast: false };
    jiraAdapterMocks.getTasks.mockResolvedValue(mockResult);

    const req = createRequest("http://localhost/api/jira?projectKey=TEST&cursor=abc");

    const res = await GET(req);
    const json = await res.json();

    expect(jiraAdapterMocks.getTasks).toHaveBeenCalledWith("TEST", "abc", undefined);

    expect(res.status).toBe(200);
    expect(json).toEqual(mockResult);
  });

  it("parses filters correctly", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    jiraAdapterMocks.getTasks.mockResolvedValue({
      issues: [],
      isLast: true,
    });

    const req = createRequest(
      "http://localhost/api/jira?projectKey=TEST&status=Done&status=In%20Progress&priority=High",
    );

    await GET(req);

    expect(jiraAdapterMocks.getTasks).toHaveBeenCalledWith("TEST", undefined, {
      status: ["Done", "In Progress"],
      priority: ["High"],
    });
  });

  it("handles JiraAuthError and clears cookie", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    jiraAdapterMocks.getTasks.mockRejectedValue(new JiraAuthError("Auth failed"));

    const req = createRequest("http://localhost/api/jira?projectKey=TEST");
    const res = await GET(req);

    expect(clearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
  });

  it("handles missing Jira connection error message", async () => {
    vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");

    jiraAdapterMocks.getTasks.mockRejectedValue(
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

    jiraAdapterMocks.getTasks.mockRejectedValue(new Error("Something broke"));

    const req = createRequest("http://localhost/api/jira?projectKey=TEST");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error.");
  });
});
