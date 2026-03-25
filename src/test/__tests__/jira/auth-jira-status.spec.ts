import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/jiraService", () => ({
  hasUserJiraConnection: vi.fn(),
}));
vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));

import { GET } from "@/app/api/auth/jira/status/route";
import { hasUserJiraConnection } from "@/services/jiraService";

const mockedHasUserJiraConnection = vi.mocked(hasUserJiraConnection);

describe("GET /api/auth/jira/status", () => {
  it("returns disconnected without cookie", async () => {
    const req = { cookies: { get: vi.fn().mockReturnValue(undefined) } } as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });

  it("returns connected true when service returns true", async () => {
    mockedHasUserJiraConnection.mockResolvedValue(true);
    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: true });
  });

  it("returns connected false when service returns false", async () => {
    mockedHasUserJiraConnection.mockResolvedValue(false);
    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "user123" }) },
    } as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });
});
