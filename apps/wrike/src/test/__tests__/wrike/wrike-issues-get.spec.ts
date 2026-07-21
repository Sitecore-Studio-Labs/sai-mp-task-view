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

import { NextRequest } from "next/server";

import { GET } from "../../../app/api/wrike/issues/route";

vi.mock("@/helpers/wrikeUserId", () => ({
  getWrikeUserIdFromSession: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearWrikeCookie: vi.fn(),
}));

import { WrikeAuthError } from "@/exceptions/wrikeErrors";
import { clearWrikeCookie } from "@/helpers/cookies";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";

describe("GET /api/wrike/issues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(url: string) {
    return new NextRequest(url);
  }

  it("returns 401 if no Wrike user session", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=TEST");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("No active Wrike connection.");
  });

  it("returns 400 if projectKey is missing", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    const req = createRequest("http://localhost/api/wrike/issues");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing required query parameter: projectKey");
  });

  it("calls adapter and returns issues successfully", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    const mockResult = { issues: [], isLast: false };
    adapterMocks.getTasks.mockResolvedValue(mockResult);

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=TEST&cursor=abc");

    const res = await GET(req);
    const json = await res.json();

    expect(adapterMocks.getTasks).toHaveBeenCalledWith("TEST", "abc", undefined);

    expect(res.status).toBe(200);
    expect(json).toEqual(mockResult);
  });

  it("parses filters correctly", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockResolvedValue({
      issues: [],
      isLast: true,
    });

    const req = createRequest(
      "http://localhost/api/wrike/issues?projectKey=TEST&status=Done&status=In%20Progress&priority=High",
    );

    await GET(req);

    expect(adapterMocks.getTasks).toHaveBeenCalledWith("TEST", undefined, {
      status: ["Done", "In Progress"],
      priority: ["High"],
    });
  });

  it("handles WrikeAuthError and clears cookie", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(new WrikeAuthError("Auth failed"));

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=TEST");
    const res = await GET(req);

    expect(clearWrikeCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
  });

  it("handles missing Wrike connection error message", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(
      new Error("No active Wrike connection found for user."),
    );

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=TEST");
    const res = await GET(req);
    const json = await res.json();

    expect(clearWrikeCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(json.error).toBe("No active Wrike connection.");
  });

  it("handles generic errors", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(new Error("Something broke"));

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=TEST");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error.");
  });
});
