/**
 * Contract test — verifies WrikeServiceAdapter satisfies the full
 * PlatformServiceAdapter interface as defined by adapter-test-kit.
 *
 * WrikeServiceAdapter resolves API access via getWrikeApiContext() and calls
 * WrikeHttpAdapter methods directly (unlike Jira, which uses named service helpers).
 * Mock getWrikeApiContext to return a stub adapter + token.
 */
import { FIXTURE_TASK, runAdapterContractSuite } from "@mp/adapter-test-kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WrikeClientError } from "@/exceptions/wrikeErrors";
import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";

import { buildWrikeCommentText, WrikeServiceAdapter } from "../WrikeServiceAdapter";

const mocks = vi.hoisted(() => {
  const mockToken = {
    accessToken: "test-access-token",
    tokenType: "bearer" as const,
  };

  const mockContact = {
    id: "user-1",
    firstName: "Test",
    lastName: "User",
    avatarUrl: "https://example.com/avatar.png",
  };

  const mockWorkflow = {
    id: "wf-1",
    name: "Default",
    customStatuses: [
      { id: "status-1", name: "To Do", standardName: "Active" as const },
      { id: "status-2", name: "In Progress", standardName: "Active" as const },
    ],
  };

  const mockTask = {
    id: "task-1",
    title: "Test task",
    customStatusId: "status-1",
    status: "Active" as const,
    importance: "Normal" as const,
    responsibleIds: ["user-1"],
    authorIds: ["user-1"],
    parentIds: ["proj-1"],
  };

  const mockComment = {
    id: "comment-1",
    authorId: "user-1",
    text: "Test comment",
    createdDate: "2024-01-01T00:00:00.000Z",
    updatedDate: "2024-01-01T00:00:00.000Z",
  };

  const adapter: WrikeHttpAdapter = {
    getProjects: vi.fn().mockResolvedValue([
      { id: "space-1", title: "Test Space", space: true, childIds: ["proj-1"] },
      { id: "proj-1", title: "Test Project", project: true },
    ]),
    getFolder: vi.fn().mockImplementation((_token, folderId: string) =>
      Promise.resolve({
        id: folderId,
        superParentIds: folderId === "proj-1" ? ["space-1"] : [],
        space: folderId === "space-1",
      }),
    ),
    getSpaces: vi.fn().mockResolvedValue([{ id: "space-1", title: "Test Space" }]),
    getSpace: vi.fn().mockResolvedValue({
      id: "space-1",
      members: [{ id: "test-user-id", accessRoleId: "role-full", isManager: false }],
    }),
    getAccessRoles: vi.fn().mockResolvedValue([
      { id: "role-full", title: "Full" },
      { id: "role-editor", title: "Editor" },
    ]),
    getTasks: vi.fn().mockResolvedValue({ tasks: [mockTask], nextPageToken: undefined }),
    getTaskById: vi.fn().mockResolvedValue(mockTask),
    getTasksByIds: vi.fn().mockResolvedValue([mockTask]),
    createTask: vi.fn().mockResolvedValue({ id: "task-1", title: "New test task" }),
    updateTask: vi.fn().mockResolvedValue(mockTask),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    getWorkflows: vi.fn().mockResolvedValue([]),
    getSpaceWorkflows: vi.fn().mockResolvedValue([mockWorkflow]),
    getContacts: vi.fn().mockResolvedValue([mockContact]),
    getCurrentContact: vi.fn().mockResolvedValue(mockContact),
    getComments: vi.fn().mockResolvedValue([mockComment]),
    createComment: vi.fn().mockResolvedValue({
      id: "comment-new",
      authorId: "user-1",
      text: "New comment text",
      createdDate: "2024-01-03T00:00:00.000Z",
      updatedDate: "2024-01-03T00:00:00.000Z",
    }),
    getAttachments: vi.fn().mockResolvedValue([]),
    getAttachmentDownloadUrl: vi
      .fn()
      .mockResolvedValue("https://example.com/attachments/attachment-1"),
    addAttachment: vi.fn().mockResolvedValue(undefined),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn().mockResolvedValue(mockToken),
  };

  return {
    mockToken,
    httpAdapter: adapter,
    getWrikeApiContext: vi.fn().mockResolvedValue({
      adapter,
      token: mockToken,
      siteId: "app-us2.wrike.com",
    }),
  };
});

vi.mock("@/services/wrikeService", () => ({
  getWrikeApiContext: mocks.getWrikeApiContext,
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer),
      headers: { get: () => "image/png" },
    }),
  );
});

runAdapterContractSuite(() => new WrikeServiceAdapter("test-user-id"));

describe("WrikeServiceAdapter custom status enrichment", () => {
  const expectedStatus = {
    id: "status-1",
    name: "To Do",
    statusCategory: { key: "indeterminate", name: "In Progress" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTasks returns custom workflow label via space-scoped workflows", async () => {
    const service = new WrikeServiceAdapter("test-user-id");
    const page = await service.getTasks("proj-1");

    expect(page.issues).toHaveLength(1);
    expect(page.issues[0].fields.status).toEqual(expectedStatus);
    expect(page.issues[0].fields.status.name).not.toBe("Active");
    expect(mocks.httpAdapter.getSpaceWorkflows).toHaveBeenCalledWith(mocks.mockToken, "space-1");
  });

  it("getTask returns custom workflow label via space-scoped workflows", async () => {
    const service = new WrikeServiceAdapter("test-user-id");
    const task = await service.getTask(FIXTURE_TASK.id);

    expect(task.fields.status).toEqual(expectedStatus);
    expect(task.fields.status.name).not.toBe("Active");
    expect(mocks.httpAdapter.getSpaceWorkflows).toHaveBeenCalledWith(mocks.mockToken, "space-1");
  });
});

describe("WrikeServiceAdapter getPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when projectKey is missing", async () => {
    const service = new WrikeServiceAdapter("test-user-id");
    await expect(service.getPermission("CREATE_ISSUES")).resolves.toBe(false);
    await expect(service.getPermission("CREATE_ISSUES", {})).resolves.toBe(false);
    await expect(service.getPermission("CREATE_ISSUES", { projectKey: "  " })).resolves.toBe(false);
    expect(mocks.getWrikeApiContext).not.toHaveBeenCalled();
  });

  it("resolves permission from space member access role", async () => {
    const service = new WrikeServiceAdapter("test-user-id");
    await expect(service.getPermission("DELETE_ISSUES", { projectKey: "proj-1" })).resolves.toBe(
      true,
    );
    expect(mocks.httpAdapter.getSpace).toHaveBeenCalledWith(mocks.mockToken, "space-1", {
      fields: ["members"],
    });
    expect(mocks.httpAdapter.getAccessRoles).toHaveBeenCalledWith(mocks.mockToken);
  });

  it("treats space managers as Full access", async () => {
    vi.mocked(mocks.httpAdapter.getSpace).mockResolvedValueOnce({
      id: "space-1",
      members: [{ id: "test-user-id", accessRoleId: "role-editor", isManager: true }],
    });

    const service = new WrikeServiceAdapter("test-user-id");
    await expect(service.getPermission("DELETE_ISSUES", { projectKey: "proj-1" })).resolves.toBe(
      true,
    );
  });

  it("falls back to Editor-like rights when user is not a space member", async () => {
    vi.mocked(mocks.httpAdapter.getSpace).mockResolvedValue({
      id: "space-1",
      members: [{ id: "someone-else", accessRoleId: "role-full", isManager: false }],
    });

    const service = new WrikeServiceAdapter("test-user-id");
    await expect(service.getPermission("CREATE_ISSUES", { projectKey: "proj-1" })).resolves.toBe(
      true,
    );
    await expect(service.getPermission("DELETE_ISSUES", { projectKey: "proj-1" })).resolves.toBe(
      false,
    );
  });

  it("falls back when space/role APIs return 403", async () => {
    vi.mocked(mocks.httpAdapter.getAccessRoles).mockRejectedValueOnce(
      new WrikeClientError("not allowed", 403, "not_allowed"),
    );

    const service = new WrikeServiceAdapter("test-user-id");
    await expect(service.getPermission("CREATE_ISSUES", { projectKey: "proj-1" })).resolves.toBe(
      true,
    );
  });

  it("uses folder-to-space map for nested boards", async () => {
    const service = new WrikeServiceAdapter("test-user-id");
    await expect(service.getPermission("CREATE_ISSUES", { projectKey: "proj-1" })).resolves.toBe(
      true,
    );
    expect(mocks.httpAdapter.getProjects).toHaveBeenCalled();
    expect(mocks.httpAdapter.getSpace).toHaveBeenCalledWith(mocks.mockToken, "space-1", {
      fields: ["members"],
    });
  });
});

describe("WrikeServiceAdapter reply mentions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("buildWrikeCommentText uses HTML mention with contact id for replies", () => {
    expect(
      buildWrikeCommentText({
        issueIdOrKey: "task-1",
        text: "hi",
        replyToCommentId: "comment-1",
        replyToAuthorId: "KX77ABC",
        replyToAuthorDisplayName: "Sanduni Galagoda",
      }),
    ).toEqual({
      text: '<a class="stream-user-id avatar" rel="KX77ABC">@Sanduni Galagoda</a> hi',
      plainText: false,
    });
  });

  it("buildWrikeCommentText escapes HTML in mention body", () => {
    expect(
      buildWrikeCommentText({
        issueIdOrKey: "task-1",
        text: "see <script>alert(1)</script>\nnext",
        replyToAuthorId: "user-1",
        replyToAuthorDisplayName: 'Ann "Tester"',
      }),
    ).toEqual({
      text: '<a class="stream-user-id avatar" rel="user-1">@Ann &quot;Tester&quot;</a> see &lt;script&gt;alert(1)&lt;/script&gt;<br />next',
      plainText: false,
    });
  });

  it("createComment posts reply as Wrike HTML mention", async () => {
    const service = new WrikeServiceAdapter("test-user-id");
    await service.createComment({
      issueIdOrKey: "task-1",
      text: "hi",
      replyToCommentId: "comment-1",
      replyToAuthorId: "KX77ABC",
      replyToAuthorDisplayName: "Sanduni Galagoda",
    });

    expect(mocks.httpAdapter.createComment).toHaveBeenCalledWith(mocks.mockToken, {
      taskId: "task-1",
      text: '<a class="stream-user-id avatar" rel="KX77ABC">@Sanduni Galagoda</a> hi',
      plainText: false,
    });
  });

  it("createComment resolves mention target from parent comment when author fields missing", async () => {
    const service = new WrikeServiceAdapter("test-user-id");
    await service.createComment({
      issueIdOrKey: "task-1",
      text: "hi",
      replyToCommentId: "comment-1",
    });

    expect(mocks.httpAdapter.getComments).toHaveBeenCalled();
    expect(mocks.httpAdapter.createComment).toHaveBeenCalledWith(mocks.mockToken, {
      taskId: "task-1",
      text: '<a class="stream-user-id avatar" rel="user-1">@Test User</a> hi',
      plainText: false,
    });
  });

  it("createComment keeps plain text for non-reply comments", async () => {
    const service = new WrikeServiceAdapter("test-user-id");
    await service.createComment({
      issueIdOrKey: "task-1",
      text: "hello",
    });

    expect(mocks.httpAdapter.createComment).toHaveBeenCalledWith(mocks.mockToken, {
      taskId: "task-1",
      text: "hello",
      plainText: true,
    });
  });
});
