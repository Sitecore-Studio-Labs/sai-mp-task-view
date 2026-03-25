import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/jiraService", () => ({
  getJiraProjectsForUser: vi.fn(),
}));
vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));

import { GET } from "@/app/api/jira/projects/route";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraProjectsForUser } from "@/services/jiraService";

const mockedGetJiraProjectsForUser = vi.mocked(getJiraProjectsForUser);
const mockedClearJiraCookie = vi.mocked(clearJiraCookie);

describe("GET /api/jira/projects", () => {
  it("returns projects when user has connection", async () => {
    const projects = [
      { id: "1", key: "PROJ1", name: "Project 1" },
      { id: "2", key: "PROJ2", name: "Project 2" },
    ];
    mockedGetJiraProjectsForUser.mockResolvedValue(projects);

    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(projects);
  });

  it("returns empty array when no cookie", async () => {
    mockedGetJiraProjectsForUser.mockResolvedValue([]);

    const req = { cookies: { get: vi.fn().mockReturnValue(undefined) } } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 401 on JiraAuthError", async () => {
    const error = new JiraAuthError("Jira auth failed");
    mockedGetJiraProjectsForUser.mockRejectedValue(error);

    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(mockedClearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Jira auth failed" });
  });

  it("returns empty array on 'No active Jira connection found for user.'", async () => {
    const error = new Error("No active Jira connection found for user.");
    mockedGetJiraProjectsForUser.mockRejectedValue(error);

    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns empty array on 'No Jira site selected. Please reconnect to Jira and select a site.'", async () => {
    const error = new Error("No Jira site selected. Please reconnect to Jira and select a site.");
    mockedGetJiraProjectsForUser.mockRejectedValue(error);

    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 on other errors", async () => {
    const error = new Error("Some other error");
    mockedGetJiraProjectsForUser.mockRejectedValue(error);

    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to load Jira projects." });
  });
});
