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
  PlatformTransition,
  PlatformUser,
  PriorityOption,
  TaskFilters,
  UpdateTaskPayload,
} from "@mp/task-core";

// --- @generated normalizer imports (generate-mappings) ---
import { normalizeCommentWithEmptyMaps, normalizeProject } from "@/platforms/wrike/generated";
// --- end @generated normalizer imports ---
import { getWrikeApiContext } from "@/services/wrikeService";
import type { WrikeCreateCommentPayload } from "@/types/wrike";

export type UserId = string;

// ── Enrichment helpers ────────────────────────────────────────────────────────
// The platform returns IDs for related entities (users, statuses, etc.) rather
// than full objects. These helpers pre-fetch lookup maps so the normalizers
// receive resolved objects instead of bare ID strings.
//
// TODO: Fill in the correct adapter calls and map shapes for this platform.
// See capabilities/wrike.api.yaml for transform annotations on each field.

type EnrichmentContext = Record<string, Map<string, unknown>>;

export async function buildEnrichmentContext(
  _adapter: unknown,
  _token: unknown,
  _items: unknown[],
): Promise<EnrichmentContext> {
  // TODO: Fetch the data needed to resolve ID references in the normalizer.
  // Example pattern:
  //   const workflows = await _adapter.getWorkflows(_token);
  //   const statusMap = new Map(workflows.flatMap(w => w.statuses).map(s => [s.id, s]));
  //   const contactIds = [...new Set(_items.flatMap(t => [...(t.responsibleIds ?? []), ...(t.authorIds ?? [])]))];
  //   const contacts = await _adapter.getContacts(_token, contactIds);
  //   const contactMap = new Map(contacts.map(c => [c.id, c]));
  //   return { statusMap, contactMap };
  return {};
}

export class WrikeServiceAdapter implements PlatformServiceAdapter {
  constructor(private readonly userId: UserId) {}

  // ── Core ──────────────────────────────────────────────────────────────────

  async getProjects(_siteId?: string): Promise<PlatformProject[]> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const folders = await adapter.getProjects(token);
    return folders.map(normalizeProject);
  }

  async getTasks(
    _projectKey: string,
    _cursor?: string,
    _filters?: Partial<TaskFilters>,
  ): Promise<PlatformTasksPageResponse> {
    // TODO: implement — call adapter.getTasks, fetch enrichment context (statusMap, contactMap, etc.),
    // then map items using the appropriate normalizer with resolved entities.
    // See buildEnrichmentContext and capabilities/wrike.api.yaml for patterns.
    void this.userId;
    return { issues: [], isLast: true };
  }

  async getTask(_taskId: string): Promise<PlatformTask> {
    // TODO: implement — fetch the task, build enrichment context (statusMap, contactMap, etc.),
    // then normalize using the appropriate normalizer with resolved entities.
    // See buildEnrichmentContext and capabilities/wrike.api.yaml for patterns.
    void this.userId;
    return {} as PlatformTask;
  }

  async createTask(_payload: CreateTaskPayload): Promise<CreateTaskResult> {
    // TODO: implement — map _payload fields to the platform's create-task API
    throw new Error("WrikeServiceAdapter.createTask not implemented");
  }

  async updateTask(_taskId: string, _payload: UpdateTaskPayload): Promise<PlatformTask> {
    // TODO: implement — map _payload fields to the platform's update-task API
    throw new Error("WrikeServiceAdapter.updateTask not implemented");
  }

  deleteTask(_taskId: string): Promise<number> {
    // TODO: implement
    return Promise.resolve(204);
  }

  getCurrentUser(): Promise<PlatformUser> {
    // TODO: implement
    throw new Error("WrikeServiceAdapter.getCurrentUser not implemented");
  }

  getProjectStatuses(_projectKey: string): Promise<PlatformProjectStatuses[]> {
    // TODO: implement
    return Promise.resolve([]);
  }

  getPermission(
    _permission: string,
    _options?: { issueKey?: string; projectKey?: string },
  ): Promise<boolean> {
    // TODO: implement
    return Promise.resolve(false);
  }

  // ── Issue types ───────────────────────────────────────────────────────────

  getIssueTypes(_projectId: string): Promise<IssueTypeOption[]> {
    return Promise.resolve([]);
  }

  // ── Priorities ────────────────────────────────────────────────────────────

  getPriorities(): Promise<PriorityOption[]> {
    // TODO: implement — return the platform's fixed or API-fetched priority list
    return Promise.resolve([]);
  }

  getProjectPriorities(_projectId: string): Promise<PriorityOption[]> {
    // TODO: implement (or delegate to getPriorities() if project-level is the same)
    return Promise.resolve([]);
  }

  // ── Assignees ─────────────────────────────────────────────────────────────

  getAssignees(_params: { projectIdOrKey: string; query?: string }): Promise<AssigneeOption[]> {
    // TODO: implement
    return Promise.resolve([]);
  }

  // ── Status transitions ────────────────────────────────────────────────────

  getTransitions(_taskId: string): Promise<PlatformTransition[]> {
    // TODO: implement
    return Promise.resolve([]);
  }

  changeStatus(_taskId: string, _transitionId: string): Promise<void> {
    // TODO: implement
    return Promise.resolve();
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async getComments(_taskId: string): Promise<PlatformCommentsResponse> {
    // TODO: implement
    return { startAt: 0, maxResults: 0, total: 0, comments: [] };
  }

  getComment(_taskId: string, _commentId: string): Promise<PlatformComment> {
    // TODO: implement
    throw new Error("WrikeServiceAdapter.getComment not implemented");
  }

  async createComment(_payload: AddCommentPayload): Promise<PlatformComment> {
    const { adapter, token } = await getWrikeApiContext(this.userId);
    const platformPayload = {
      taskId: _payload.issueIdOrKey,
      text: _payload.text,
    } as WrikeCreateCommentPayload;
    const raw = await adapter.createComment(token, platformPayload);
    returnnormalizeCommentWithEmptyMaps(raw as Parameters<typeof normalizeCommentWithEmptyMaps>[0]);
  }

  // ── Attachments ───────────────────────────────────────────────────────────

  getAttachmentContent(_attachmentId: string): Promise<unknown> {
    // TODO: implement
    return Promise.resolve(null);
  }

  addAttachment(
    _taskId: string,
    _file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<void> {
    // TODO: implement — POST multipart to the platform API.
    // When using form-data + axios, merge auth headers with form.getHeaders():
    //   const { headers: authHeaders } = this.auth(token);
    //   headers: { ...authHeaders, ...form.getHeaders() }
    return Promise.resolve();
  }

  deleteAttachment(_attachmentId: string): Promise<void> {
    // TODO: implement
    return Promise.resolve();
  }
}
