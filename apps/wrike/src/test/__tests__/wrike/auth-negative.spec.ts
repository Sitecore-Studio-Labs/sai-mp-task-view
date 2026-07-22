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

vi.mock("@/helpers/wrikeUserId", () => ({
  getWrikeUserIdFromSession: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearWrikeCookie: vi.fn(),
}));

vi.mock("@/exceptions/wrikeErrors", () => ({
  WrikeAuthError: class WrikeAuthError extends Error {},
}));

vi.mock("@/lib/authStrategy", () => ({
  authStrategy: {
    revoke: vi.fn(),
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  createSupabaseServerClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@mp/token-storage", () => ({
  SupabaseTokenStore: vi.fn().mockImplementation(() => ({
    deleteSessionsForUser: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@/services/wrikeSetupService", () => ({
  disconnectAndWipeUserWrike: vi.fn(),
}));

import { POST as disconnectPost } from "@/app/api/auth/wrike/disconnect/route";
import { GET as commentsGet, POST as commentsPost } from "@/app/api/wrike/comments/route";
import {
  GET as transitionsGet,
  POST as transitionsPost,
} from "@/app/api/wrike/issues/[issueIdOrKey]/transitions/route";
import { WrikeAuthError } from "@/exceptions/wrikeErrors";
import { clearWrikeCookie } from "@/helpers/cookies";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";

function createRequest(url: string, method = "GET", body?: unknown): NextRequest {
  const init: { method: string; body?: string; headers?: Record<string, string> } = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, init);
}

describe("Auth negative tests — unauthenticated requests rejected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/wrike/disconnect", () => {
    it("clears cookie and returns ok when no session", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/auth/wrike/disconnect", "POST");
      const res = await disconnectPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true });
      expect(clearWrikeCookie).toHaveBeenCalled();
    });

    it("revokes session and clears cookie when connected", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
      const req = createRequest("http://localhost/api/auth/wrike/disconnect", "POST", {});
      const res = await disconnectPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true });
      expect(clearWrikeCookie).toHaveBeenCalled();
    });
  });

  describe("GET /api/wrike/comments", () => {
    it("returns 401 when no session cookie", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/wrike/comments?issueIdOrKey=TEST-1");
      const res = await commentsGet(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 and clears cookie on WrikeAuthError", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
      adapterMocks.getComments.mockRejectedValue(new WrikeAuthError("Token revoked"));
      const req = createRequest("http://localhost/api/wrike/comments?issueIdOrKey=TEST-1");
      const res = await commentsGet(req);
      expect(res.status).toBe(401);
      expect(clearWrikeCookie).toHaveBeenCalled();
    });

    it("returns 401 on 'No active Wrike connection' error", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
      adapterMocks.getComments.mockRejectedValue(
        new Error("No active Wrike connection found for user."),
      );
      const req = createRequest("http://localhost/api/wrike/comments?issueIdOrKey=TEST-1");
      const res = await commentsGet(req);
      expect(res.status).toBe(401);
      expect(clearWrikeCookie).toHaveBeenCalled();
    });

    it("does not leak error details in 500 response", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
      adapterMocks.getComments.mockRejectedValue(new Error("Internal DB error with credentials"));
      const req = createRequest("http://localhost/api/wrike/comments?issueIdOrKey=TEST-1");
      const res = await commentsGet(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Internal server error.");
      expect(json.details).toBeUndefined();
    });
  });

  describe("POST /api/wrike/comments", () => {
    it("returns 401 when no session cookie", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/wrike/comments", "POST", {
        issueIdOrKey: "TEST-1",
        text: "Hello",
      });
      const res = await commentsPost(req);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/wrike/issues/[issueIdOrKey]/transitions", () => {
    it("returns 401 when no session cookie", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/wrike/issues/TEST-1/transitions");
      const res = await transitionsGet(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 401 and clears cookie on WrikeAuthError", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
      adapterMocks.getTransitions.mockRejectedValue(new WrikeAuthError("Expired"));
      const req = createRequest("http://localhost/api/wrike/issues/TEST-1/transitions");
      const res = await transitionsGet(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(401);
      expect(clearWrikeCookie).toHaveBeenCalled();
    });

    it("does not leak error.message in 500 response", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
      adapterMocks.getTransitions.mockRejectedValue(new Error("secret internal details"));
      const req = createRequest("http://localhost/api/wrike/issues/TEST-1/transitions");
      const res = await transitionsGet(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({ error: "Internal server error." });
    });
  });

  describe("POST /api/wrike/issues/[issueIdOrKey]/transitions", () => {
    it("returns 401 when no session cookie", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/wrike/issues/TEST-1/transitions", "POST", {
        transitionId: "2",
      });
      const res = await transitionsPost(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 400 when body is invalid JSON", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
      const req = new NextRequest("http://localhost/api/wrike/issues/TEST-1/transitions", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      });
      const res = await transitionsPost(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when transitionId is missing", async () => {
      vi.mocked(getWrikeUserIdFromSession).mockResolvedValue("user-1");
      const req = createRequest("http://localhost/api/wrike/issues/TEST-1/transitions", "POST", {});
      const res = await transitionsPost(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(400);
    });
  });
});
