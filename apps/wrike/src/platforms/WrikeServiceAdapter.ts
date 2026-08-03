import { mapAssignee } from "@mp/shared";
import type {
  AddCommentPayload,
  AssigneeOption,
  CreateTaskPayload,
  CreateTaskResult,
  IssueTypeOption,
  PlatformComment,
  PlatformCommentsResponse,
  PlatformProject,
  PlatformProjectStatuses,
  PlatformServiceAdapter,
  PlatformTask,
  PlatformTasksPageResponse,
  PlatformToken,
  PlatformTransition,
  PlatformUser,
  PriorityOption,
  TaskFilters,
  UpdateTaskPayload,
} from "@mp/task-core";

import { WrikeClientError } from "@/exceptions/wrikeErrors";
// --- @generated normalizer imports (generate-mappings) ---
import { normalizeComment, normalizeProject, normalizeTask } from "@/platforms/wrike/generated";
// --- end @generated normalizer imports ---
import {
  buildEnrichmentContext,
  contactToPlatformUser,
  findMissingCustomStatusIds,
  loadWorkflowsForFolder,
  loadWorkflowsForTask,
  resolveSpaceIdForFolder,
  resolveTaskPlatformStatus,
  resolveWorkflowFolderIds,
  supplementStatusMapFromAllSpaces,
  workflowsToProjectStatuses,
  workflowsToTransitions,
} from "@/platforms/wrike/wrikeEnrichment";
import { filterPhysicalFolderIds } from "@/platforms/wrike/wrikeFolderUtils";
import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";
import { toWrikeCreateBody, toWrikeUpdateBody } from "@/platforms/wrike/wrikePayloads";
import {
  hasWrikeFolderAccessFallback,
  hasWrikePermission,
  WRIKE_ACCESS_ROLE_FULL,
} from "@/platforms/wrike/wrikePermissions";
import {
  buildFolderToSpaceMap,
  buildHierarchicalWrikeProjects,
} from "@/platforms/wrike/wrikeProjectTree";
import { applyWrikeClientTaskFilters } from "@/platforms/wrike/wrikeTaskFilters";
import { getWrikeApiContext } from "@/services/wrikeService";
import type { WrikeAccessRole, WrikeContact, WrikeCustomStatus, WrikeTask } from "@/types/wrike";

export type UserId = string;

const WRIKE_PRIORITIES: PriorityOption[] = [
  { id: "High", name: "High" },
  { id: "Normal", name: "Normal" },
  { id: "Low", name: "Low" },
];

export class WrikeServiceAdapter implements PlatformServiceAdapter {
  constructor(private readonly userId: UserId) {}

  private folderToSpaceCache: Map<string, string> | null = null;

  private async getFolderToSpaceMap(
    adapter: WrikeHttpAdapter,
    token: PlatformToken,
  ): Promise<Map<string, string>> {
    if (!this.folderToSpaceCache) {
      const folders = await adapter.getProjects(token);
      this.folderToSpaceCache = buildFolderToSpaceMap(folders);
    }
    return this.folderToSpaceCache;
  }

  private collectWorkflowFolderIds(folderId: string | undefined, raws: WrikeTask[]): string[] {
    const folderIds = new Set<string>();
    if (folderId) folderIds.add(folderId);
    for (const raw of raws) {
      for (const id of filterPhysicalFolderIds(raw.parentIds)) {
        folderIds.add(id);
      }
    }
    return [...folderIds];
  }

  private normalizeWrikeTask(
    raw: WrikeTask,
    statusMap: Map<string, WrikeCustomStatus>,
    contactMap: Map<string, WrikeContact>,
  ): PlatformTask {
    const task = normalizeTask(raw, statusMap, contactMap);
    return {
      ...task,
      fields: {
        ...task.fields,
        status: resolveTaskPlatformStatus(raw, statusMap),
        // Real attachments are loaded in enrichTaskDetails; drop generated stub.
        attachment: undefined,
      },
    };
  }

  private async enrichAndNormalizeTasks(
    adapter: WrikeHttpAdapter,
    token: PlatformToken,
    raws: WrikeTask[],
    folderId?: string,
  ): Promise<PlatformTask[]> {
    const folderToSpace = await this.getFolderToSpaceMap(adapter, token);
    const folderIds = this.collectWorkflowFolderIds(folderId, raws);
    const { statusMap, contactMap } = await buildEnrichmentContext(
      adapter,
      token,
      folderIds,
      folderToSpace,
    );
    const missingStatusIds = findMissingCustomStatusIds(raws, statusMap);
    if (missingStatusIds.length > 0) {
      await supplementStatusMapFromAllSpaces(adapter, token, statusMap, missingStatusIds);
    }
    return raws.map((raw) => this.normalizeWrikeTask(raw, statusMap, contactMap));
  }

  private async enrichAndNormalizeTask(
    adapter: WrikeHttpAdapter,
    token: PlatformToken,
    raw: WrikeTask,
    folderId?: string,
  ): Promise<PlatformTask> {
    const tasks = await this.enrichAndNormalizeTasks(adapter, token, [raw], folderId);
    return tasks[0];
  }

  private async enrichTaskDetails(
    adapter: WrikeHttpAdapter,
    token: PlatformToken,
    raw: WrikeTask,
    task: PlatformTask,
  ): Promise<PlatformTask> {
    if (raw.superTaskIds?.[0]) {
      try {
        const parentRaw = await adapter.getTaskById(token, raw.superTaskIds[0]);
        task.fields.parent = {
          id: parentRaw.id,
          key: parentRaw.id,
          summary: parentRaw.title ?? "",
        };
      } catch (error) {
        console.error("[WrikeServiceAdapter] Failed to load parent task:", error);
      }
    }

    if (raw.subTaskIds?.length) {
      const subtaskRaws = await adapter.getTasksByIds(token, raw.subTaskIds);
      const parentFolderIds = await resolveWorkflowFolderIds(adapter, token, raw);
      task.fields.subtasks = await this.enrichAndNormalizeTasks(
        adapter,
        token,
        subtaskRaws,
        parentFolderIds[0],
      );
    }

    try {
      const attachments = await adapter.getAttachments(token, raw.id);
      task.fields.attachment =
        attachments.length > 0
          ? attachments.map((file) => ({
              id: file.id,
              filename: file.name ?? file.id,
              ...(file.url ? { content: file.url } : {}),
              ...(file.contentType ? { mimeType: file.contentType } : {}),
            }))
          : undefined;
    } catch (error) {
      console.error("[WrikeServiceAdapter] Failed to load attachments:", error);
    }

    return task;
  }

  async getProjects(_siteId?: string): Promise<PlatformProject[]> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const folders = await adapter.getProjects(token);
    return buildHierarchicalWrikeProjects(folders, (folder, extras) => ({
      ...normalizeProject(folder),
      ...extras,
    }));
  }

  async getTasks(
    projectKey: string,
    cursor?: string,
    filters?: Partial<TaskFilters>,
  ): Promise<PlatformTasksPageResponse> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const page = await adapter.getTasks(token, projectKey, cursor, filters);
    const issues = applyWrikeClientTaskFilters(
      await this.enrichAndNormalizeTasks(adapter, token, page.tasks, projectKey),
      filters,
    );
    return {
      issues,
      nextPageToken: page.nextPageToken,
      isLast: !page.nextPageToken,
    };
  }

  async getTask(taskId: string): Promise<PlatformTask> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const raw = await adapter.getTaskById(token, taskId);
    const folderIds = await resolveWorkflowFolderIds(adapter, token, raw);
    const task = await this.enrichAndNormalizeTask(adapter, token, raw, folderIds[0]);
    return this.enrichTaskDetails(adapter, token, raw, task);
  }

  async createTask(payload: CreateTaskPayload): Promise<CreateTaskResult> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const body = toWrikeCreateBody(payload);
    const raw = await adapter.createTask(token, payload.projectId, body);
    return {
      id: raw.id,
      key: raw.id,
      summary: raw.title ?? payload.summary,
      projectId: payload.projectId,
      projectKey: payload.projectId,
    };
  }

  async updateTask(taskId: string, payload: UpdateTaskPayload): Promise<PlatformTask> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const current = await adapter.getTaskById(token, taskId);
    const body = toWrikeUpdateBody(payload, current);
    const raw = await adapter.updateTask(token, taskId, body);
    const folderIds = await resolveWorkflowFolderIds(adapter, token, raw);
    const task = await this.enrichAndNormalizeTask(adapter, token, raw, folderIds[0]);
    return this.enrichTaskDetails(adapter, token, raw, task);
  }

  async deleteTask(taskId: string): Promise<number> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    await adapter.deleteTask(token, taskId);
    return 204;
  }

  async getCurrentUser(): Promise<PlatformUser> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const contact = await adapter.getCurrentContact(token);
    return contactToPlatformUser(contact);
  }

  async getProjectStatuses(projectKey: string): Promise<PlatformProjectStatuses[]> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const folderToSpace = await this.getFolderToSpaceMap(adapter, token);
    const workflows = await loadWorkflowsForFolder(adapter, token, projectKey, folderToSpace);
    return workflowsToProjectStatuses(workflows);
  }

  async getPermission(
    permission: string,
    options?: { issueKey?: string; projectKey?: string },
  ): Promise<boolean> {
    void options?.issueKey;
    const projectKey = options?.projectKey?.trim();
    if (!projectKey) return false;

    const { adapter, token } = await getWrikeApiContext(this.userId);
    const folderToSpace = await this.getFolderToSpaceMap(adapter, token);
    const spaceId =
      folderToSpace.get(projectKey) ?? (await resolveSpaceIdForFolder(adapter, token, projectKey));

    // Folder may be shared without a resolvable space (or only via folder share).
    if (!spaceId) return hasWrikeFolderAccessFallback(permission);

    try {
      const [space, accessRoles, currentContact] = await Promise.all([
        adapter.getSpace(token, spaceId, { fields: ["members"] }),
        adapter.getAccessRoles(token),
        adapter.getCurrentContact(token),
      ]);

      const contactId = currentContact.id || this.userId;
      const member = space.members?.find((m) => m.id === contactId || m.id === this.userId);

      // Visible in project list but not listed on the space (folder-only / group share).
      if (!member) return hasWrikeFolderAccessFallback(permission);

      const roleTitle = member.isManager
        ? WRIKE_ACCESS_ROLE_FULL
        : resolveAccessRoleTitle(accessRoles, member.accessRoleId);

      if (!roleTitle) return false;
      return hasWrikePermission(roleTitle, permission);
    } catch (error) {
      // Space/role APIs can return not_allowed even when the user can work in the folder.
      if (error instanceof WrikeClientError && error.statusCode === 403) {
        return hasWrikeFolderAccessFallback(permission);
      }
      throw error;
    }
  }

  getIssueTypes(_projectId: string): Promise<IssueTypeOption[]> {
    return Promise.resolve([]);
  }

  getPriorities(): Promise<PriorityOption[]> {
    return Promise.resolve(WRIKE_PRIORITIES);
  }

  getProjectPriorities(_projectId: string): Promise<PriorityOption[]> {
    return Promise.resolve(WRIKE_PRIORITIES);
  }

  async getAssignees(params: {
    projectIdOrKey: string;
    query?: string;
  }): Promise<AssigneeOption[]> {
    void params.projectIdOrKey;
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const contacts = await adapter.getContacts(token);
    const q = params.query?.trim().toLowerCase();
    return contacts
      .filter((c) => c.type !== "Group" && !c.deleted)
      .filter((c) => {
        if (!q) return true;
        const name = `${c.firstName} ${c.lastName}`.trim().toLowerCase();
        return name.includes(q);
      })
      .flatMap((c) => {
        const option = mapAssignee({
          accountId: c.id,
          displayName: `${c.firstName} ${c.lastName}`.trim(),
          avatarUrl: c.avatarUrl,
        });
        return option ? [option] : [];
      });
  }

  async getTransitions(taskId: string): Promise<PlatformTransition[]> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const folderToSpace = await this.getFolderToSpaceMap(adapter, token);
    const task = await adapter.getTaskById(token, taskId);
    const workflows = await loadWorkflowsForTask(adapter, token, task, folderToSpace);
    return workflowsToTransitions(workflows);
  }

  async changeStatus(taskId: string, transitionId: string): Promise<void> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    await adapter.updateTask(token, taskId, { customStatus: transitionId });
  }

  async getComments(taskId: string): Promise<PlatformCommentsResponse> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const rawComments = await adapter.getComments(token, taskId);
    const { contactMap } = await buildEnrichmentContext(adapter, token);
    const comments = rawComments.map((c) => normalizeComment(c, contactMap));
    return {
      startAt: 0,
      maxResults: comments.length,
      total: comments.length,
      comments,
    };
  }

  async getComment(taskId: string, commentId: string): Promise<PlatformComment> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const rawComments = await adapter.getComments(token, taskId);
    const raw = rawComments.find((c) => c.id === commentId);
    if (!raw) throw new Error(`Comment not found: ${commentId}`);
    const { contactMap } = await buildEnrichmentContext(adapter, token);
    return normalizeComment(raw, contactMap);
  }

  async createComment(payload: AddCommentPayload): Promise<PlatformComment> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const enriched = await enrichReplyMentionTarget(adapter, token, payload);
    const { text, plainText } = buildWrikeCommentText(enriched);
    const raw = await adapter.createComment(token, {
      taskId: enriched.issueIdOrKey,
      text,
      plainText,
    });
    const { contactMap } = await buildEnrichmentContext(adapter, token);
    return normalizeComment(raw, contactMap);
  }

  async getAttachmentContent(
    attachmentId: string,
  ): Promise<{ data: Uint8Array; contentType: string }> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const url = await adapter.getAttachmentDownloadUrl(token, attachmentId);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download attachment ${attachmentId}`);
    const buffer = await res.arrayBuffer();
    return {
      data: new Uint8Array(buffer),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  async addAttachment(
    taskId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<void> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    await adapter.addAttachment(token, taskId, file);
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    await adapter.deleteAttachment(token, attachmentId);
  }
}

function resolveAccessRoleTitle(
  accessRoles: WrikeAccessRole[],
  accessRoleId: string,
): string | undefined {
  return accessRoles.find((role) => role.id === accessRoleId)?.title;
}

function escapeWrikeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * If Reply was clicked but author id/name did not arrive on the payload,
 * resolve them from the parent comment so we can still build a Wrike @mention.
 */
async function enrichReplyMentionTarget(
  adapter: WrikeHttpAdapter,
  token: PlatformToken,
  payload: AddCommentPayload,
): Promise<AddCommentPayload> {
  const needsAuthorId = !payload.replyToAuthorId?.trim();
  const needsAuthorName = !payload.replyToAuthorDisplayName?.trim();
  if (!payload.replyToCommentId || (!needsAuthorId && !needsAuthorName)) {
    return payload;
  }

  const rawComments = await adapter.getComments(token, payload.issueIdOrKey);
  const parent = rawComments.find((c) => c.id === payload.replyToCommentId);
  if (!parent?.authorId) return payload;

  const { contactMap } = await buildEnrichmentContext(adapter, token);
  const contact = contactMap.get(parent.authorId);
  const displayName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : parent.authorId;

  return {
    ...payload,
    replyToAuthorId: payload.replyToAuthorId?.trim() || parent.authorId,
    replyToAuthorDisplayName: payload.replyToAuthorDisplayName?.trim() || displayName,
  };
}

/**
 * Build comment text for Wrike create. Replies use official mention HTML
 * with plainText=false so Wrike notifies and renders the mention.
 * See https://developers.wrike.com/docs/special-syntax
 *
 * Required shape:
 * `<a class="stream-user-id avatar" rel="USER_ID">@Name</a>`
 */
export function buildWrikeCommentText(payload: AddCommentPayload): {
  text: string;
  plainText: boolean;
} {
  const replyToAuthorId = payload.replyToAuthorId?.trim();
  const replyToAuthorDisplayName = payload.replyToAuthorDisplayName?.trim();
  const text = payload.text;

  if (replyToAuthorId && replyToAuthorDisplayName) {
    const mention = `<a class="stream-user-id avatar" rel="${escapeWrikeHtml(replyToAuthorId)}">@${escapeWrikeHtml(replyToAuthorDisplayName)}</a>`;
    const body = escapeWrikeHtml(text).replace(/\r\n|\r|\n/g, "<br />");
    return { text: `${mention} ${body}`, plainText: false };
  }
  if (replyToAuthorDisplayName) {
    // Fallback when id is missing — visible @Name, but may not notify in Wrike.
    return { text: `@${replyToAuthorDisplayName} ${text}`, plainText: true };
  }
  return { text, plainText: true };
}
