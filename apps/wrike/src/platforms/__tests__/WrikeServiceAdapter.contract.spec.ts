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

import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";

import { WrikeServiceAdapter } from "../WrikeServiceAdapter";

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
    listWebhooks: vi.fn().mockResolvedValue([]),
    createFolderWebhook: vi.fn().mockResolvedValue({
      id: "webhook-1",
      hookUrl: "https://example.com/api/webhooks/wrike",
      status: "Active" as const,
    }),
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
