/**
 * Contract test — verifies JiraServiceAdapter satisfies the full PlatformServiceAdapter
 * interface as defined by adapter-test-kit.
 *
 * How this works:
 * - @/services/jiraService is mocked so tests never hit real Supabase or Jira APIs.
 * - Each mock returns the minimum data needed to produce valid @mp/task-core shapes after
 *   the generated normalizers (normalizeTask, normalizeProject, normalizeComment) run.
 * - runAdapterContractSuite runs all 23 contract assertions automatically.
 *
 * Pattern to follow for new adapters — see docs/guides/new-platform-app.md.
 */
import { runAdapterContractSuite } from "@mp/adapter-test-kit";
import { vi } from "vitest";

import { JiraServiceAdapter } from "../JiraServiceAdapter";

// vi.mock is hoisted before module-level variable declarations by Vitest.
// All mock data used in the factory must be defined inside vi.hoisted() so
// they are available when the hoisted mock runs.
const mocks = vi.hoisted(() => {
  const MOCK_USER = {
    accountId: "user-1",
    displayName: "Test User",
    avatarUrls: { "48x48": "https://example.com/avatar.png" },
  };

  const MOCK_STATUS = {
    id: "status-1",
    name: "To Do",
    description: "",
    statusCategory: { id: "2", key: "new", name: "To Do" },
  };

  const MOCK_ISSUE = {
    id: "task-1",
    key: "TEST-1",
    fields: {
      summary: "Test task",
      status: MOCK_STATUS,
      project: { id: "proj-1", key: "TEST", name: "Test Project" },
      issuetype: { id: "issuetype-1", name: "Story", iconUrl: "https://example.com/story.png" },
      priority: { id: "priority-1", name: "Medium", iconUrl: "https://example.com/medium.png" },
      assignee: MOCK_USER,
    },
  };

  const MOCK_COMMENT = {
    id: "comment-1",
    self: "https://example.atlassian.net/rest/api/3/issue/task-1/comment/comment-1",
    author: MOCK_USER,
    updateAuthor: MOCK_USER,
    body: {
      type: "doc",
      version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: "Test comment" }] }],
    },
    created: "2024-01-01T00:00:00.000Z",
    updated: "2024-01-01T00:00:00.000Z",
  };

  return {
    getJiraProjectsForUser: vi
      .fn()
      .mockResolvedValue([{ id: "proj-1", key: "TEST", name: "Test Project" }]),
    getJiraIssuesForProject: vi.fn().mockResolvedValue({ issues: [MOCK_ISSUE], isLast: true }),
    getDetailsForIssue: vi.fn().mockResolvedValue(MOCK_ISSUE),
    createJiraTaskForUser: vi.fn().mockResolvedValue({
      id: "task-1",
      key: "TEST-1",
      self: "https://example.atlassian.net/rest/api/3/issue/task-1",
      summary: "Test task",
      projectId: "proj-1",
      projectKey: "TEST",
      issueTypeId: "issuetype-1",
      issueTypeName: "Story",
    }),
    updateJiraTaskForUser: vi.fn().mockResolvedValue(MOCK_ISSUE),
    deleteJiraIssue: vi.fn().mockResolvedValue(204),
    getJiraIssueTypesForProject: vi
      .fn()
      .mockResolvedValue([
        { id: "issuetype-1", name: "Story", iconUrl: "https://example.com/story.png" },
      ]),
    getJiraPrioritiesForUser: vi
      .fn()
      .mockResolvedValue([
        { id: "priority-1", name: "Medium", iconUrl: "https://example.com/medium.png" },
      ]),
    getJiraPrioritiesForProject: vi
      .fn()
      .mockResolvedValue([
        { id: "priority-1", name: "Medium", iconUrl: "https://example.com/medium.png" },
      ]),
    searchJiraAssigneesForUser: vi.fn().mockResolvedValue([MOCK_USER]),
    getJiraCurrentUser: vi.fn().mockResolvedValue(MOCK_USER),
    getProjectIssueStatuses: vi.fn().mockResolvedValue([
      {
        id: "status-1",
        name: "To Do",
        statuses: [
          { id: "status-1", name: "To Do", statusCategory: { key: "new", name: "To Do" } },
        ],
      },
    ]),
    getIssueTransitions: vi.fn().mockResolvedValue([
      {
        id: "transition-1",
        name: "Start Progress",
        to: {
          id: "status-2",
          name: "In Progress",
          statusCategory: { key: "indeterminate", name: "In Progress" },
        },
      },
    ]),
    issueStatusChange: vi.fn().mockResolvedValue(undefined),
    getCommentsForIssue: vi.fn().mockResolvedValue({
      startAt: 0,
      maxResults: 50,
      total: 1,
      comments: [MOCK_COMMENT],
    }),
    getDetailsForComment: vi.fn().mockResolvedValue(MOCK_COMMENT),
    createCommentForIssue: vi.fn().mockResolvedValue(MOCK_COMMENT),
    getPermission: vi.fn().mockResolvedValue(true),
    addAttachmentToJiraIssue: vi.fn().mockResolvedValue(undefined),
    getAttachmentContent: vi
      .fn()
      .mockResolvedValue({ content: "base64data", mimeType: "image/png" }),
    deleteAttachmentForUser: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/services/jiraService", () => mocks);

// ── Run the contract suite ────────────────────────────────────────────────────
runAdapterContractSuite(() => new JiraServiceAdapter("test-user-id"));
