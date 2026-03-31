/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";

import { POST } from "../../../app/api/jira/issues/route";

vi.mock("@/helpers/jiraUserId", () => ({
  getJiraUserIdFromSession: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));

vi.mock("@/services/jiraService", () => ({
  createJiraTaskForUser: vi.fn(),
}));

vi.mock("@razroo/html-to-adf", () => ({
  default: {
    htmlToAdf: vi.fn().mockReturnValue({}),
  },
}));

const { getJiraUserIdFromSession } = await import("@/helpers/jiraUserId");
const { clearJiraCookie } = await import("@/helpers/cookies");
const { createJiraTaskForUser } = await import("@/services/jiraService");

function mockRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/jira", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 if no Jira session", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue(null);

    const req = mockRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("No active Jira connection.");
  });

  it("returns 400 for invalid JSON", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    const req = {
      json: vi.fn().mockRejectedValue(new Error("invalid")),
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid JSON body.");
  });

  it("returns 400 if required fields are missing", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    const req = mockRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("projectId");
  });

  it("creates Jira task successfully", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    const mockTask = { id: "123", key: "TEST-1" };
    (createJiraTaskForUser as any).mockResolvedValue(mockTask);

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(mockTask);
    expect(createJiraTaskForUser).toHaveBeenCalledWith("user-1", {
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });
  });

  it("validates dueDate format", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
      dueDate: "invalid-date",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("dueDate");
  });

  it("handles JiraAuthError and clears cookie", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    (createJiraTaskForUser as any).mockRejectedValue(new JiraAuthError("Unauthorized"));

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(clearJiraCookie).toHaveBeenCalled();
    expect(json.error).toBe("Unauthorized");
  });

  it("handles JiraClientError", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    (createJiraTaskForUser as any).mockRejectedValue(new JiraClientError("Bad request", 400));

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Bad request");
  });

  it("handles generic errors", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    (createJiraTaskForUser as any).mockRejectedValue(new Error("Something broke"));

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to create Jira issue.");
  });

  it("handles missing Jira connection error message", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    (createJiraTaskForUser as any).mockRejectedValue(
      new Error("No active Jira connection found for user."),
    );

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(clearJiraCookie).toHaveBeenCalled();
    expect(json.error).toBe("No active Jira connection.");
  });
});
