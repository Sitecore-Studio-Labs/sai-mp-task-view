import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/jiraService", () => ({
  getJiraIssuesForProject: vi.fn(),
}));
vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));
vi.mock("@razroo/html-to-adf", () => ({
  convertHtmlToADF: vi.fn().mockReturnValue({}),
}));

import { GET } from "@/app/api/jira/issues/route";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraIssuesForProject } from "@/services/jiraService";
import { JiraProjectIssuesResponse } from "@/types/jira";

const mockedGetJiraIssuesForProject = vi.mocked(getJiraIssuesForProject);
const mockedClearJiraCookie = vi.mocked(clearJiraCookie);

describe("GET /api/jira/issues", () => {
  it("returns issues with projectKey", async () => {
    const result: JiraProjectIssuesResponse = {
      issues: [
        {
          id: "1",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            status: {
              id: "1",
              name: "Open",
              description: "",
              statusCategory: { id: "1", key: "new", name: "To Do" },
            },
            issuetype: { id: "10001", name: "Task" },
          },
        },
      ],
      nextPageToken: "12345",
      isLast: false,
    };
    mockedGetJiraIssuesForProject.mockResolvedValue(result);

    const req = {
      nextUrl: { searchParams: new URLSearchParams("projectKey=PROJ") },
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(mockedGetJiraIssuesForProject).toHaveBeenCalledWith(
      "user123",
      "PROJ",
      undefined,
      undefined,
    );
  });

  it("passes filters from query params", async () => {
    const result = { issues: [], isLast: true };
    mockedGetJiraIssuesForProject.mockResolvedValue(result);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams(
          "projectKey=PROJ&status=Done&status=In Progress&priority=High&assignee=user1&assignee=user2",
        ),
      },
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(mockedGetJiraIssuesForProject).toHaveBeenCalledWith("user123", "PROJ", undefined, {
      status: ["Done", "In Progress"],
      priority: ["High"],
      assignee: ["user1", "user2"],
    });
  });

  it("passes cursor for pagination", async () => {
    const result = { issues: [], isLast: true };
    mockedGetJiraIssuesForProject.mockResolvedValue(result);

    const req = {
      nextUrl: { searchParams: new URLSearchParams("projectKey=PROJ&cursor=cursor123") },
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(mockedGetJiraIssuesForProject).toHaveBeenCalledWith(
      "user123",
      "PROJ",
      "cursor123",
      undefined,
    );
  });

  it("returns 400 when projectKey is missing", async () => {
    const req = {
      nextUrl: { searchParams: new URLSearchParams("") },
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing required query parameter: projectKey" });
  });

  it("returns 401 on JiraAuthError", async () => {
    const error = new JiraAuthError("Jira session has expired. Please reconnect Jira.");
    mockedGetJiraIssuesForProject.mockRejectedValue(error);

    const req = {
      nextUrl: { searchParams: new URLSearchParams("projectKey=PROJ") },
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(mockedClearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Jira session has expired. Please reconnect Jira." });
  });

  it("returns 401 on 'No active Jira connection found for user.'", async () => {
    const error = new Error("No active Jira connection found for user.");
    mockedGetJiraIssuesForProject.mockRejectedValue(error);

    const req = {
      nextUrl: { searchParams: new URLSearchParams("projectKey=PROJ") },
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(mockedClearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "No active Jira connection." });
  });

  it("returns 500 on other errors", async () => {
    const error = new Error("Error");
    mockedGetJiraIssuesForProject.mockRejectedValue(error);

    const req = {
      nextUrl: { searchParams: new URLSearchParams("projectKey=PROJ") },
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to search issues." });
  });
});
