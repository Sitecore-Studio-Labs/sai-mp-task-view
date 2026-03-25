import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/jiraService", () => ({
  createJiraTaskForUser: vi.fn(),
}));
vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));
vi.mock("@razroo/html-to-adf", () => ({
  convertHtmlToADF: vi.fn().mockReturnValue({}),
}));

import { POST } from "@/app/api/jira/issues/route";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import { createJiraTaskForUser } from "@/services/jiraService";
import { JiraTask } from "@/types/jira";

const mockedCreateJiraTaskForUser = vi.mocked(createJiraTaskForUser);
const mockedClearJiraCookie = vi.mocked(clearJiraCookie);

describe("POST /api/jira/issues", () => {
  it("creates issue with valid payload", async () => {
    const payload = {
      projectId: "PROJ",
      issueTypeId: "10001",
      summary: "Test issue",
      description: "Description",
      priority: "High",
      assignee: "user123",
      dueDate: "2024-12-31",
      parentIssueKey: "PROJ-1",
    };
    const task: JiraTask = {
      id: "123",
      key: "PROJ-123",
      self: "https://jira.example.com/rest/api/2/issue/123",
      summary: "Test issue",
      description: "Description",
      projectId: "PROJ",
      projectKey: "PROJ",
      issueTypeId: "10001",
      issueTypeName: "Task",
      priorityId: "1",
      priorityName: "High",
      assigneeAccountId: "user123",
      assigneeDisplayName: "User",
      dueDate: "2024-12-31",
    };
    mockedCreateJiraTaskForUser.mockResolvedValue(task);

    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(task);
    expect(mockedCreateJiraTaskForUser).toHaveBeenCalledWith("user123", payload);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = {
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("returns 400 when projectId is missing", async () => {
    const payload = { issueTypeId: "10001", summary: "Test" };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Missing or invalid body field: projectId (string).",
    });
  });

  it("returns 400 when projectId is not string", async () => {
    const payload = { projectId: 123, issueTypeId: "10001", summary: "Test" };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Missing or invalid body field: projectId (string).",
    });
  });

  it("returns 400 when issueTypeId is missing", async () => {
    const payload = { projectId: "PROJ", summary: "Test" };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Missing or invalid body field: issueTypeId (string).",
    });
  });

  it("returns 400 when summary is missing", async () => {
    const payload = { projectId: "PROJ", issueTypeId: "10001" };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Missing or invalid body field: summary (non-empty string).",
    });
  });

  it("returns 400 when summary is empty", async () => {
    const payload = { projectId: "PROJ", issueTypeId: "10001", summary: "   " };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Missing or invalid body field: summary (non-empty string).",
    });
  });

  it("returns 400 when priority is not string", async () => {
    const payload = { projectId: "PROJ", issueTypeId: "10001", summary: "Test", priority: 123 };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body field: priority (string)." });
  });

  it("returns 400 when assignee is not string", async () => {
    const payload = { projectId: "PROJ", issueTypeId: "10001", summary: "Test", assignee: 123 };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body field: assignee (string accountId)." });
  });

  it("returns 400 when dueDate is invalid", async () => {
    const payload = {
      projectId: "PROJ",
      issueTypeId: "10001",
      summary: "Test",
      dueDate: "invalid",
    };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Invalid body field: dueDate (expected ISO date/datetime string).",
    });
  });

  it("returns 400 when parentIssueKey is not string", async () => {
    const payload = {
      projectId: "PROJ",
      issueTypeId: "10001",
      summary: "Test",
      parentIssueKey: 123,
    };
    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body field: parentIssueKey (string)." });
  });

  it("returns 401 on JiraAuthError", async () => {
    const payload = { projectId: "PROJ", issueTypeId: "10001", summary: "Test" };
    const error = new JiraAuthError("Auth failed");
    mockedCreateJiraTaskForUser.mockRejectedValue(error);

    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(mockedClearJiraCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Auth failed" });
  });

  it("returns status from JiraClientError", async () => {
    const payload = { projectId: "PROJ", issueTypeId: "10001", summary: "Test" };
    const error = new JiraClientError("Client error", 422);
    mockedCreateJiraTaskForUser.mockRejectedValue(error);

    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Client error" });
  });

  it("returns 500 on other errors", async () => {
    const payload = { projectId: "PROJ", issueTypeId: "10001", summary: "Test" };
    const error = new Error("Some error");
    mockedCreateJiraTaskForUser.mockRejectedValue(error);

    const req = {
      json: vi.fn().mockResolvedValue(payload),
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to create Jira issue." });
  });
});
