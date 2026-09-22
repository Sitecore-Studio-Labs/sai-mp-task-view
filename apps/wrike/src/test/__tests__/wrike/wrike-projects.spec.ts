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

import { WrikeAuthError } from "@/exceptions/wrikeErrors";
import * as cookiesModule from "@/helpers/cookies";
import * as userIdModule from "@/helpers/wrikeUserId";

import { GET } from "../../../app/api/wrike/projects/route";

vi.mock("@/helpers/wrikeUserId");
vi.mock("@/helpers/cookies");

function createRequest(url = "http://localhost/api/wrike/projects") {
  return new NextRequest(url);
}

describe("GET /api/wrike/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no userId", async () => {
    vi.spyOn(userIdModule, "getWrikeUserIdFromSession").mockResolvedValue(null);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns projects when successful", async () => {
    const mockProjects = [{ id: "1", key: "key-1", name: "Test Project" }];

    vi.spyOn(userIdModule, "getWrikeUserIdFromSession").mockResolvedValue("user-123");
    adapterMocks.getProjects.mockResolvedValue(mockProjects);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProjects);
  });

  it("handles WrikeAuthError and clears cookie", async () => {
    vi.spyOn(userIdModule, "getWrikeUserIdFromSession").mockResolvedValue("user-123");
    adapterMocks.getProjects.mockRejectedValue(new WrikeAuthError("Unauthorized"));

    const clearSpy = vi.spyOn(cookiesModule, "clearWrikeCookie").mockResolvedValue();

    const response = await GET(createRequest());
    const data = await response.json();

    expect(clearSpy).toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns empty array when no active Wrike connection found", async () => {
    vi.spyOn(userIdModule, "getWrikeUserIdFromSession").mockResolvedValue("user-123");
    adapterMocks.getProjects.mockRejectedValue(
      new Error("No active Wrike connection found for user."),
    );

    const clearSpy = vi.spyOn(cookiesModule, "clearWrikeCookie").mockResolvedValue();

    const response = await GET(createRequest());
    const data = await response.json();

    expect(clearSpy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns empty array when no Wrike site selected", async () => {
    vi.spyOn(userIdModule, "getWrikeUserIdFromSession").mockResolvedValue("user-123");
    adapterMocks.getProjects.mockRejectedValue(
      new Error("No Wrike site selected. Please reconnect to Wrike and select a site."),
    );

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns 500 for unknown errors", async () => {
    vi.spyOn(userIdModule, "getWrikeUserIdFromSession").mockResolvedValue("user-123");
    adapterMocks.getProjects.mockRejectedValue(new Error("Unexpected failure"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(createRequest());
    const data = await response.json();

    expect(consoleSpy).toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Internal server error." });
  });
});
