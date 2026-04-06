import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/helpers/jiraUserId", () => ({
  getJiraUserIdFromSession: vi.fn(),
}));

vi.mock("@/helpers/cookies", () => ({
  clearJiraCookie: vi.fn(),
}));

vi.mock("@/exceptions/jiraErrors", () => ({
  JiraAuthError: class JiraAuthError extends Error {},
}));

vi.mock("@/services/jiraService", () => ({
  disconnectUserJira: vi.fn(),
  getCommentsForIssue: vi.fn(),
  createCommentForIssue: vi.fn(),
  getIssueTransitions: vi.fn(),
  issueStatusChange: vi.fn(),
  getUserJiraConnection: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  createSupabaseServerClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/platforms/jira/JiraAdapter", () => ({
  JiraClientError: class JiraClientError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import { POST as disconnectPost } from "@/app/api/auth/jira/disconnect/route";
import { GET as commentsGet, POST as commentsPost } from "@/app/api/jira/comments/route";
import {
  GET as transitionsGet,
  POST as transitionsPost,
} from "@/app/api/jira/issues/[issueIdOrKey]/transitions/route";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import {
  disconnectUserJira,
  getCommentsForIssue,
  getIssueTransitions,
} from "@/services/jiraService";

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

  describe("POST /api/auth/jira/disconnect", () => {
    it("returns 404 when no session cookie", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/auth/jira/disconnect", "POST");
      const res = await disconnectPost(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("No active Jira connection.");
    });

    it("returns 401 and clears cookie on JiraAuthError", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      vi.mocked(disconnectUserJira).mockRejectedValue(new JiraAuthError("Session expired"));
      const req = createRequest("http://localhost/api/auth/jira/disconnect", "POST");
      const res = await disconnectPost(req);
      expect(res.status).toBe(401);
      expect(clearJiraCookie).toHaveBeenCalled();
    });

    it("returns 500 on unexpected error without leaking details", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      vi.mocked(disconnectUserJira).mockRejectedValue(new Error("DB timeout with secret info"));
      const req = createRequest("http://localhost/api/auth/jira/disconnect", "POST");
      const res = await disconnectPost(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Failed to disconnect");
      expect(JSON.stringify(json)).not.toContain("secret");
    });
  });

  describe("GET /api/jira/comments", () => {
    it("returns 404 when no session cookie", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/jira/comments?issueIdOrKey=TEST-1");
      const res = await commentsGet(req);
      expect(res.status).toBe(404);
    });

    it("returns 401 and clears cookie on JiraAuthError", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      vi.mocked(getCommentsForIssue).mockRejectedValue(new JiraAuthError("Token revoked"));
      const req = createRequest("http://localhost/api/jira/comments?issueIdOrKey=TEST-1");
      const res = await commentsGet(req);
      expect(res.status).toBe(401);
      expect(clearJiraCookie).toHaveBeenCalled();
    });

    it("returns 401 on 'No active Jira connection' error", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      vi.mocked(getCommentsForIssue).mockRejectedValue(
        new Error("No active Jira connection found for user."),
      );
      const req = createRequest("http://localhost/api/jira/comments?issueIdOrKey=TEST-1");
      const res = await commentsGet(req);
      expect(res.status).toBe(401);
      expect(clearJiraCookie).toHaveBeenCalled();
    });

    it("does not leak error details in 500 response", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      vi.mocked(getCommentsForIssue).mockRejectedValue(
        new Error("Internal DB error with credentials"),
      );
      const req = createRequest("http://localhost/api/jira/comments?issueIdOrKey=TEST-1");
      const res = await commentsGet(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Failed to load comments for issue.");
      expect(json.details).toBeUndefined();
    });
  });

  describe("POST /api/jira/comments", () => {
    it("returns 404 when no session cookie", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/jira/comments", "POST", {
        issueIdOrKey: "TEST-1",
        text: "Hello",
      });
      const res = await commentsPost(req);
      expect(res.status).toBe(404);
    });

    it("returns 400 when issueIdOrKey is missing", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      const req = createRequest("http://localhost/api/jira/comments", "POST", {
        text: "Hello",
      });
      const res = await commentsPost(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when text is missing", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      const req = createRequest("http://localhost/api/jira/comments", "POST", {
        issueIdOrKey: "TEST-1",
      });
      const res = await commentsPost(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/jira/issues/[issueIdOrKey]/transitions", () => {
    it("returns 404 when no session cookie", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/jira/issues/TEST-1/transitions");
      const res = await transitionsGet(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 401 and clears cookie on JiraAuthError", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      vi.mocked(getIssueTransitions).mockRejectedValue(new JiraAuthError("Expired"));
      const req = createRequest("http://localhost/api/jira/issues/TEST-1/transitions");
      const res = await transitionsGet(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(401);
      expect(clearJiraCookie).toHaveBeenCalled();
    });

    it("does not leak error.message in 500 response", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      vi.mocked(getIssueTransitions).mockRejectedValue(new Error("secret internal details"));
      const req = createRequest("http://localhost/api/jira/issues/TEST-1/transitions");
      const res = await transitionsGet(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Failed to fetch transitions.");
      expect(json.message).toBeUndefined();
      expect(JSON.stringify(json)).not.toContain("secret");
    });
  });

  describe("POST /api/jira/issues/[issueIdOrKey]/transitions", () => {
    it("returns 404 when no session cookie", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/jira/issues/TEST-1/transitions", "POST", {
        transitionId: "2",
      });
      const res = await transitionsPost(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 400 when body is invalid JSON", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      const req = new NextRequest("http://localhost/api/jira/issues/TEST-1/transitions", {
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
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      const req = createRequest("http://localhost/api/jira/issues/TEST-1/transitions", "POST", {});
      const res = await transitionsPost(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when transitionId is not a string", async () => {
      vi.mocked(getJiraUserIdFromSession).mockResolvedValue("user-1");
      const req = createRequest("http://localhost/api/jira/issues/TEST-1/transitions", "POST", {
        transitionId: 123,
      });
      const res = await transitionsPost(req, {
        params: Promise.resolve({ issueIdOrKey: "TEST-1" }),
      });
      expect(res.status).toBe(400);
    });
  });
});
