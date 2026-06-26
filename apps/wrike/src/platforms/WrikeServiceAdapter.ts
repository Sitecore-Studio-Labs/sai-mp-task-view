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

// --- @generated normalizer imports (generate-mappings) ---
import { normalizeComment, normalizeProject, normalizeTask } from "@/platforms/wrike/generated";
// --- end @generated normalizer imports ---
import {
  buildEnrichmentContext,
  contactToPlatformUser,
  loadWorkflowsForFolder,
  loadWorkflowsForTask,
  pickWorkflowsForTask,
  resolveTaskPlatformStatus,
  resolveWorkflowFolderIds,
  workflowsToProjectStatuses,
  workflowsToTransitions,
} from "@/platforms/wrike/wrikeEnrichment";
import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";
import { toWrikeCreateBody, toWrikeUpdateBody } from "@/platforms/wrike/wrikePayloads";
import { buildHierarchicalWrikeProjects } from "@/platforms/wrike/wrikeProjectTree";
import { applyWrikeClientTaskFilters } from "@/platforms/wrike/wrikeTaskFilters";
import { getWrikeApiContext } from "@/services/wrikeService";
import type { WrikeContact, WrikeCustomStatus, WrikeTask } from "@/types/wrike";

export type UserId = string;

const WRIKE_PRIORITIES: PriorityOption[] = [
  { id: "High", name: "High" },
  { id: "Normal", name: "Normal" },
  { id: "Low", name: "Low" },
];

export class WrikeServiceAdapter implements PlatformServiceAdapter {
  constructor(private readonly userId: UserId) {}

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
    const { statusMap, contactMap } = await buildEnrichmentContext(adapter, token, folderId);
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
    const workflows = await loadWorkflowsForFolder(adapter, token, projectKey);
    return workflowsToProjectStatuses(workflows);
  }

  getPermission(
    _permission: string,
    _options?: { issueKey?: string; projectKey?: string },
  ): Promise<boolean> {
    return Promise.resolve(true);
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
    const task = await adapter.getTaskById(token, taskId);
    const workflows = await loadWorkflowsForTask(adapter, token, task);
    const scoped = pickWorkflowsForTask(workflows, task.customStatusId);
    return workflowsToTransitions(scoped);
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
    let text = payload.text;
    if (payload.replyToAuthorDisplayName && !payload.replyToCommentId) {
      text = `@${payload.replyToAuthorDisplayName} ${text}`;
    }
    const raw = await adapter.createComment(token, {
      taskId: payload.issueIdOrKey,
      text,
      plainText: true,
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
