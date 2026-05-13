import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import * as cookiesModule from "@/helpers/cookies";
import * as jiraUserIdModule from "@/helpers/jiraUserId";
import * as jiraServiceModule from "@/services/jiraService";
import { JiraProject } from "@/types/jira";

import { GET } from "../../../app/api/jira/projects/route";

vi.mock("@/helpers/jiraUserId");
vi.mock("@/services/jiraService");
vi.mock("@/helpers/cookies");
vi.mock("@razroo/html-to-adf", () => ({
  default: {
    htmlToAdf: vi.fn().mockReturnValue({}),
  },
}));

describe("GET /jira/projects", () => {
  const mockRequest = {
    nextUrl: new URL("http://localhost/api/jira/projects"),
    headers: new Headers(),
  } as unknown as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with error message if no userId", async () => {
    vi.spyOn(jiraUserIdModule, "getJiraUserIdFromSession").mockResolvedValue(null);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ error: "No active Jira connection." });
  });

  it("returns projects when successful", async () => {
    const mockProjects: JiraProject[] = [{ id: "1", key: "key-1", name: "Test Project" }];

    vi.spyOn(jiraUserIdModule, "getJiraUserIdFromSession").mockResolvedValue("user-123");
    vi.spyOn(jiraServiceModule, "getJiraProjectsForUser").mockResolvedValue(mockProjects);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProjects);
  });

  it("handles JiraAuthError and clears cookie", async () => {
    vi.spyOn(jiraUserIdModule, "getJiraUserIdFromSession").mockResolvedValue("user-123");
    vi.spyOn(jiraServiceModule, "getJiraProjectsForUser").mockRejectedValue(
      new JiraAuthError("Unauthorized"),
    );

    const clearSpy = vi.spyOn(cookiesModule, "clearJiraCookie").mockResolvedValue();

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(clearSpy).toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns empty array when no active Jira connection found", async () => {
    vi.spyOn(jiraUserIdModule, "getJiraUserIdFromSession").mockResolvedValue("user-123");
    vi.spyOn(jiraServiceModule, "getJiraProjectsForUser").mockRejectedValue(
      new Error("No active Jira connection found for user."),
    );

    const clearSpy = vi.spyOn(cookiesModule, "clearJiraCookie").mockResolvedValue();

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(clearSpy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns empty array when no Jira site selected", async () => {
    vi.spyOn(jiraUserIdModule, "getJiraUserIdFromSession").mockResolvedValue("user-123");
    vi.spyOn(jiraServiceModule, "getJiraProjectsForUser").mockRejectedValue(
      new Error("No Jira site selected. Please reconnect to Jira and select a site."),
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns 500 for unknown errors", async () => {
    vi.spyOn(jiraUserIdModule, "getJiraUserIdFromSession").mockResolvedValue("user-123");
    vi.spyOn(jiraServiceModule, "getJiraProjectsForUser").mockRejectedValue(
      new Error("Unexpected failure"),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(consoleSpy).toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to load Jira projects." });
  });
});
