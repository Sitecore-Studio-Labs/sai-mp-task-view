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

import { WrikeAuthError, WrikeClientError } from "@/exceptions/wrikeErrors";
import { clearWrikeCookie } from "@/helpers/cookies";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";

import { GET } from "../../../app/api/wrike/issues/route";

vi.mock("@/helpers/wrikeUserId", () => ({
  getWrikeUserIdFromSession: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearWrikeCookie: vi.fn(),
}));

describe("GET /api/wrike/issues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(url: string) {
    return new NextRequest(url);
  }

  it("returns 401 if no Wrike user session", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=folder-1");
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

  it("calls adapter and returns tasks successfully", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    const mockResult = { issues: [], isLast: true, nextPageToken: undefined };
    adapterMocks.getTasks.mockResolvedValue(mockResult);

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=folder-1&cursor=abc");

    const res = await GET(req);
    const json = await res.json();

    expect(adapterMocks.getTasks).toHaveBeenCalledWith("folder-1", "abc", undefined);
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
      "http://localhost/api/wrike/issues?projectKey=folder-1&status=Active&status=Completed&priority=High",
    );

    await GET(req);

    expect(adapterMocks.getTasks).toHaveBeenCalledWith("folder-1", undefined, {
      status: ["Active", "Completed"],
      priority: ["High"],
    });
  });

  it("passes through WrikeClientError 429 with retry message", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(
      new WrikeClientError(
        "Too many requests to Wrike. Please wait a moment and try again.",
        429,
        "too_many_requests",
      ),
    );

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=folder-1");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Too many requests to Wrike. Please wait a moment and try again.");
  });

  it("maps WrikeClientError 503 to 502 with retry message", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(
      new WrikeClientError(
        "Wrike is temporarily unavailable. Please try again in a few minutes.",
        503,
        "server_error",
      ),
    );

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=folder-1");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe("Wrike is temporarily unavailable. Please try again in a few minutes.");
  });

  it("maps WrikeClientError network failure to 502", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(
      new WrikeClientError(
        "Could not connect to Wrike. Please try again in a few minutes.",
        502,
        "network_error",
      ),
    );

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=folder-1");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe("Could not connect to Wrike. Please try again in a few minutes.");
  });

  it("handles WrikeAuthError and clears cookie", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(new WrikeAuthError("Auth failed"));

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=folder-1");
    const res = await GET(req);

    expect(clearWrikeCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
  });

  it("handles missing Wrike connection error message", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(
      new Error("No active Wrike connection found for user."),
    );

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=folder-1");
    const res = await GET(req);
    const json = await res.json();

    expect(clearWrikeCookie).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(json.error).toBe("No active Wrike connection.");
  });

  it("handles generic errors", async () => {
    vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");

    adapterMocks.getTasks.mockRejectedValue(new Error("Something broke"));

    const req = createRequest("http://localhost/api/wrike/issues?projectKey=folder-1");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error.");
  });
});
