/* eslint-disable @typescript-eslint/no-explicit-any */
import { PlatformApiError } from "@mp/task-core";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JiraAuthError } from "@/exceptions/jiraErrors";

import { POST } from "../../../app/api/jira/issues/route";
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

const { getJiraUserIdFromSession } = await import("@/helpers/jiraUserId");
const { clearJiraCookie } = await import("@/helpers/cookies");

function mockRequest(body: unknown) {
  return new NextRequest("http://localhost/api/jira/issues", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/jira", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if no Jira session", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue(null);

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("No active Jira connection.");
  });

  it("returns 400 for invalid JSON", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    const req = new NextRequest("http://localhost/api/jira/issues", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });

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
    expect(json.error).toBe("Validation failed.");
    expect(json.details).toBeDefined();
  });

  it("creates Jira task successfully", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    const mockTask = { id: "123", key: "TEST-1" };
    jiraAdapterMocks.createTask.mockResolvedValue(mockTask);

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(mockTask);
    expect(jiraAdapterMocks.createTask).toHaveBeenCalledWith({
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
    expect(json.error).toBe("Validation failed.");
  });

  it("handles JiraAuthError and clears cookie", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    jiraAdapterMocks.createTask.mockRejectedValue(new JiraAuthError("Unauthorized"));

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

  it("handles PlatformApiError client errors", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    jiraAdapterMocks.createTask.mockRejectedValue(new PlatformApiError("Bad request", 400));

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

    jiraAdapterMocks.createTask.mockRejectedValue(new Error("Something broke"));

    const req = mockRequest({
      projectId: "proj-1",
      issueTypeId: "bug",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error.");
  });

  it("handles missing Jira connection error message", async () => {
    (getJiraUserIdFromSession as any).mockResolvedValue("user-1");

    jiraAdapterMocks.createTask.mockRejectedValue(
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
