import { beforeEach, describe, expect, it, vi } from "vitest";

const adapterMocks = vi.hoisted(() => ({
  getProjects: vi.fn(),
  getTasks: vi.fn(),
  createTask: vi.fn(),
  getComments: vi.fn(),
  createComment: vi.fn(),
  getTransitions: vi.fn(),
  changeStatus: vi.fn(),
}));

vi.mock("@/platforms/WrikeServiceAdapter", () => ({
  WrikeServiceAdapter: vi.fn(() => adapterMocks),
}));

import { PlatformApiError } from "@mp/task-core";
import { NextRequest } from "next/server";

import { WrikeAuthError } from "@/exceptions/wrikeErrors";

import { POST } from "../../../app/api/wrike/issues/route";

vi.mock("@/helpers/wrikeUserId", () => ({
  getWrikeUserIdFromSession: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearWrikeCookie: vi.fn(),
}));

const { getWrikeUserIdFromSession } = await import("@/helpers/wrikeUserId");
const { clearWrikeCookie } = await import("@/helpers/cookies");

function mockRequest(body: unknown) {
  return new NextRequest("http://localhost/api/wrike/issues", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/wrike/issues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if no Wrike session", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);

    const req = mockRequest({
      projectId: "proj-1",
      summary: "Test issue",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("No active Wrike connection.");
  });

  it("returns 400 for invalid JSON", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    const req = new NextRequest("http://localhost/api/wrike/issues", {
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
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    const req = mockRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Validation failed.");
    expect(json.details).toBeDefined();
  });

  it("creates Wrike task successfully", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    const mockTask = { id: "123", key: "TEST-1" };
    adapterMocks.createTask.mockResolvedValue(mockTask);

    const req = mockRequest({
      projectId: "proj-1",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(mockTask);
    expect(adapterMocks.createTask).toHaveBeenCalledWith({
      projectId: "proj-1",
      issueTypeId: "task",
      summary: "Test issue",
    });
  });

  it("validates dueDate format", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    const req = mockRequest({
      projectId: "proj-1",
      summary: "Test issue",
      dueDate: "invalid-date",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Validation failed.");
  });

  it("handles WrikeAuthError and clears cookie", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.createTask.mockRejectedValue(new WrikeAuthError("Unauthorized"));

    const req = mockRequest({
      projectId: "proj-1",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(clearWrikeCookie).toHaveBeenCalled();
    expect(json.error).toBe("Unauthorized");
  });

  it("handles PlatformApiError client errors", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.createTask.mockRejectedValue(new PlatformApiError("Bad request", 400));

    const req = mockRequest({
      projectId: "proj-1",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Bad request");
  });

  it("handles generic errors", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.createTask.mockRejectedValue(new Error("Something broke"));

    const req = mockRequest({
      projectId: "proj-1",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error.");
  });

  it("handles missing Wrike connection error message", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.createTask.mockRejectedValue(
      new Error("No active Wrike connection found for user."),
    );

    const req = mockRequest({
      projectId: "proj-1",
      summary: "Test issue",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(clearWrikeCookie).toHaveBeenCalled();
    expect(json.error).toBe("No active Wrike connection.");
  });
});
