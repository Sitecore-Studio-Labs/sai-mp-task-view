# TODO.md — Adaptive Task Generation & Integration Engine

This document defines the complete development plan for the **Adaptive Task Generation & Integration Engine**. Implement each section in order. Each item is categorized as **Backend**, **UI**, **Adapter**, or **AI Orchestration**, and references **Task Creation Form UI** reuse where applicable.

---

## 1. Architecture & Tech Stack

| # | Category | Task | Description |
|---|----------|------|-------------|
| 1.1 | Backend | **Define high-level architecture** | Document the flow: Requirement Input → AI Parser → Internal Work Model → Platform Adapter → External API. Define boundaries for API routes, serverless/Edge vs Node, and where AI is invoked. |
| 1.2 | Backend | **Choose persistence for work breakdowns** | Decide storage for AI-generated work breakdowns (e.g. Supabase/Postgres table, or in-memory + optional DB). Define schema for drafts, status (draft / approved / published / synced), and link to platform project. |
| 1.3 | Backend | **Define environment and secrets** | Document env vars for AI provider (e.g. OpenAI API key), platform credentials, and any queue/worker config. Use server-side only for secrets. |

---

## 2. JSON Schema and Internal Models

| # | Category | Task | Description |
|---|----------|------|-------------|
| 2.1 | Backend | **Create internal work breakdown JSON schema** | Define a Zod/JSON schema for the canonical hierarchy: **Epic** (optional) → **Story** → **Task** → **Subtask**. Each node: `id`, `title`, `description`, `type` (epic|story|task|subtask), `children[]`, `metadata` (e.g. priority, assignee hint). Support flat list with `parentId` or nested tree. |
| 2.2 | Backend | **Create platform mapping config types** | Define types for mapping internal types to platform-specific types (e.g. internal `story` → Jira `Story`, internal `task` → Jira `Task`). Include project-specific issue type IDs and field mappings. |
| 2.3 | Backend | **Add validation and normalization utilities** | Implement validation of AI output against the internal schema; normalize and assign stable temporary IDs for items not yet published. |

---

## 3. Backend API Endpoints

| # | Category | Task | Description |
|---|----------|------|-------------|
| 3.1 | Backend | **POST /api/ai/parse-requirements** | Accept free-text business requirements (and optional context: project key, platform). Call AI to produce structured work breakdown JSON. Return validated internal model (Epics/Stories/Tasks/Subtasks). |
| 3.2 | Backend | **POST /api/workbreakdown** (or similar) | Accept internal work breakdown JSON; optionally persist as draft; return stored draft ID and normalized structure for UI. |
| 3.3 | Backend | **GET /api/workbreakdown/[draftId]** | Return a single work breakdown draft by ID for preview/edit. |
| 3.4 | Backend | **PATCH /api/workbreakdown/[draftId]** | Update draft (e.g. after user edits in UI). Support partial updates. |
| 3.5 | Backend | **POST /api/workbreakdown/[draftId]/publish** | Translate internal model to platform model and create issues via platform adapter. Return created issue keys/IDs and sync status. |
| 3.6 | Backend | **GET /api/sync/status** (optional) | Return sync status for published items (e.g. last sync time, errors). |

---

## 4. Adapter Layers for Each Platform

| # | Category | Task | Description |
|---|----------|------|-------------|
| 4.1 | Adapter | **Define PlatformAdapter interface for work breakdown** | Extend or add interface: `createIssue(payload)`, `updateIssue(id, payload)`, `mapInternalToPlatform(internalNode, projectContext)`. Support hierarchy (parent key for Jira, section/list for Trello, etc.). |
| 4.2 | Adapter | **Implement Jira work-breakdown mapping** | In JiraAdapter (or new module): map internal Epic/Story/Task/Subtask to Jira issue types and create in order (parent before children). Reuse existing Jira API client and auth. |
| 4.3 | Adapter | **Implement Asana adapter (optional)** | Same interface: map internal model to Asana projects/sections/tasks; implement create/update. |
| 4.4 | Adapter | **Implement Trello adapter (optional)** | Map to boards/lists/cards; implement create/update. |
| 4.5 | Adapter | **Error handling and retries** | In adapters: handle rate limits, 4xx/5xx, and return structured errors (e.g. `{ code, message, platformResponse }`) for UI and logging. |

---

## 5. UI Components and Reuse of Task Form UI

| # | Category | Task | Description |
|---|----------|------|-------------|
| 5.1 | UI | **AI requirement entry on Create Task screen** ✅ (Starting point) | Add an **animated icon button** (e.g. magic wand / AI) in the **top-right** of `CreateTaskView`. On click, **expand** a text area for “Business requirements / description” used to generate tasks. Animate expand/collapse (e.g. height/opacity). Keep existing manual create form visible; this is the entry point for AI flow. |
| 5.2 | UI | **Requirement-to-breakdown flow** | When user submits the requirement text (e.g. “Generate” button next to text area): call `POST /api/ai/parse-requirements`, then navigate or open a **Preview Work Breakdown** view with the returned JSON (tree or list). Use TanStack Query: `useMutation` for parse, `useQuery` for draft by ID. |
| 5.3 | UI | **Preview Work Breakdown screen** | New view: display Epics → Stories → Tasks → Subtasks (tree or list). Each row: title, type, description snippet; actions: **Edit**, **Delete**, **Add child**. **Edit** must open the **Task Creation Form UI in edit mode** (see 5.4). Use TanStack Query for draft: `useQuery(['workbreakdown', draftId])`, `useMutation` for PATCH. |
| 5.4 | UI | **Reuse Task Form UI for editing AI-suggested items** | For each editable node (Story/Task/Subtask), **reuse the existing Task Form UI** (`task-form` components under `src/components/tasks/task-form/`). Invoke as **edit** by pre-filling form with AI-suggested title, description, type, etc. Use same `CreateTaskFormValues`-compatible shape; for **draft** items use local state or draft API; when publishing, map to platform. **Do not** build a separate “edit AI task” screen—open the same form with `defaultValues` set from the selected node and `submitLabel="Save"` / `submittingLabel="Saving…"`. |
| 5.5 | UI | **Approval & Publish UI** | On Preview screen: “Approve & Publish” (or “Publish to [Platform]”) button. Confirm step optional. Call `POST /api/workbreakdown/[draftId]/publish`. Show progress (e.g. “Creating 5 issues…”) and result (success + issue keys, or errors). Use `useMutation`; invalidate lists/queries after success. |
| 5.6 | UI | **TanStack Query usage** | **List/detail:** `useQuery` for work breakdown draft, project list, issue types. **Mutations:** `useMutation` for parse-requirements, PATCH draft, publish. Invalidate `['workbreakdown', draftId]` and task list queries after publish. Provide loading and error states in UI. |
| 5.7 | UI | **Navigation and routing** | Ensure clear path: Create Task (manual) → AI button → requirement text → Generate → Preview Work Breakdown → Edit (Task Form) → Publish. Use existing routing (e.g. task-manager-extension) or add a dedicated route for “AI work breakdown” if needed. |

---

## 6. AI Prompt Templates and Parsing Logic

| # | Category | Task | Description |
|---|----------|------|-------------|
| 6.1 | AI Orchestration | **Design and version AI prompt templates** | Create a system + user prompt that: (1) accepts free-text requirements, (2) outputs **strict JSON** matching the internal work breakdown schema. Include few-shot examples. Version templates (e.g. in `/prompts` or config). |
| 6.2 | AI Orchestration | **Implement JSON extraction and validation** | After AI response: extract JSON (handle markdown code blocks if present), parse with Zod/internal schema, validate. On failure: retry with repair prompt or return validation errors to UI. |
| 6.3 | AI Orchestration | **Map AI output to internal model** | Normalize AI output to internal IDs and structure; assign temporary IDs for new items; ensure parent-child order for publish. |

---

## 7. Integration Workflow

| # | Category | Task | Description |
|---|----------|------|-------------|
| 7.1 | Backend | **Orchestration layer** | Single entry for “publish draft”: load draft → resolve platform adapter → map each node to platform payload → create in order (parents first) → store external IDs for sync. |
| 7.2 | Backend | **Queue or sequential publish** | Decide: sequential create in one request, or queue jobs for large breakdowns. Implement at least sequential with progress/errors. |
| 7.3 | UI | **End-to-end flow** | Requirement → Parse → Preview → Edit (Task Form) → Publish → Show result and link to platform. |

---

## 8. Sync, Error Handling, and Logging

| # | Category | Task | Description |
|---|----------|------|-------------|
| 8.1 | Backend | **Bi-directional sync (optional)** | If required: webhook or poll for external updates (status, assignee); update local/draft or show “synced” state. Define webhook endpoint and platform config. |
| 8.2 | Backend | **Structured error handling** | API and adapters return consistent error shape (e.g. `{ code, message, details }`). Log failures with draft ID, platform, and payload (sanitized). |
| 8.3 | UI | **Error display and retry** | Show API and publish errors in UI (e.g. Alert + Retry). Use TanStack Query error state and optional retry. |

---

## 9. Testing Strategies

| # | Category | Task | Description |
|---|----------|------|-------------|
| 9.1 | Backend | **Unit tests for JSON schema and normalization** | Test internal schema validation and ID assignment with sample AI-like JSON. |
| 9.2 | Adapter | **Integration tests for platform adapters** | Mock or use test project: create issue, update issue, verify hierarchy. Test error paths (invalid type, 401, 404). |
| 9.3 | Backend | **API tests** | Test parse-requirements and publish endpoints with mocked AI and adapter. |
| 9.4 | UI | **E2E or component tests** | Test: open Create Task → click AI button → expand text area → submit requirement → (mock) preview; open Edit → Task Form with pre-filled data; Publish flow with mock. |

---

## Instructions and Examples

### Reusing the Task Creation Form UI for edit (AI-suggested items)

- **Where:** Preview Work Breakdown screen; each row has an “Edit” action.
- **How:** Render the same form used in `CreateTaskView` (from `./task-form`), wrapped in a provider that supplies:
  - `defaultFormValues`: from the AI-suggested node (summary, description, issueTypeId, priority, etc.).
  - Same provider (e.g. `JiraCreateTaskProvider`) so issue types, priorities, assignees load.
- **Edit vs Create:** Use `TaskFormActions` with `submitLabel="Save"` and `submittingLabel="Saving…"`. On submit, call **PATCH draft** (update that node in the work breakdown) or, if already published, call platform **update issue** API.
- **Example flow:** User clicks “Edit” on a Story in the preview → open modal or slide-over with `TaskForm*` components and `FormProvider`; form pre-filled with story title/description; on Save → update draft node and close.

### TanStack Query: list / detail / mutation

- **Parse requirements:**  
  `const parseMutation = useMutation({ mutationFn: (text) => parseRequirements(text), onSuccess: (data) => { setDraftId(data.draftId); navigate to preview; } });`
- **Load draft:**  
  `const { data, isLoading } = useQuery({ queryKey: ['workbreakdown', draftId], queryFn: () => fetchDraft(draftId), enabled: !!draftId });`
- **Update draft:**  
  `const updateMutation = useMutation({ mutationFn: ({ draftId, body }) => patchDraft(draftId, body), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workbreakdown', draftId] }) });`
- **Publish:**  
  `const publishMutation = useMutation({ mutationFn: (draftId) => publishDraft(draftId), onSuccess: () => { invalidate workbreakdown and task list queries } });`

### Test, validate, and publish to connected platform

- **Validate:** Before publish, UI can show validation (required fields, type mapping). Backend validates draft structure and platform mapping.
- **Publish:** Call `POST /api/workbreakdown/[draftId]/publish` with selected project/platform. Backend creates issues in order; returns created keys and errors per item.
- **Test:** Use a dedicated Jira/Asana/Trello test project; run publish with a small draft; verify hierarchy and content in the platform.

---

## Implementation Order (Sequential)

1. **Architecture & Tech Stack** (1.1–1.3)  
2. **JSON Schema and Internal Models** (2.1–2.3)  
3. **Backend API Endpoints** (3.1–3.6)  
4. **Adapter work-breakdown interface and Jira** (4.1–4.2, 4.5)  
5. **AI Prompt and parsing** (6.1–6.3)  
6. **UI: AI requirement entry** (5.1) ✅ **START HERE**  
7. **UI: Requirement → Parse → Preview** (5.2, 5.7)  
8. **UI: Preview Work Breakdown + Edit via Task Form** (5.3, 5.4, 5.6)  
9. **UI: Approval & Publish** (5.5)  
10. **Orchestration and publish** (7.1–7.3)  
11. **Sync, errors, logging** (8.1–8.3)  
12. **Optional adapters (Asana, Trello)** (4.3–4.4)  
13. **Testing** (9.1–9.4)  

---

**Next step for developer:** Implement **5.1 (AI requirement entry on Create Task screen)** first: animated icon button in top-right of `CreateTaskView`, expanding to a text area for business requirements, then proceed through the list in order.
