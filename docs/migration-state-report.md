# MIGRATION STATE REPORT

This document maps progress to `migration-mvp-guide.md` and is descriptive only; it does not prescribe new work beyond what the guide already defines.

**Last checkpoint update:** PHASE 3.3 **batch 3** — sites snapshot, select site/project, priorities, issue types, current user, connection status + disconnect, attachment blob/open/delete/upload (including **`JiraCreateTaskProvider`** / **`JiraEditTaskProvider`** uploads); **`JiraBffClient`** strips **`Content-Type`** when **`body`** is **`FormData`**; exported **`JiraSitesSnapshot`**.

### PHASE 3.3 Batch 3 — `COMPLETED`

- Scope checklist (BffClient FormData, extension methods, listed hooks, Jira create/edit upload paths, build + ESLint) is **done** in `apps/jira-app` + `libs/providers/jira`.
- **`getConnectionStatus`** → `GET /api/auth/jira/status`; **`disconnectJira`** → `POST /api/auth/jira/disconnect` (not a single combined call).
- **`apiClient`**: no Jira usage in hooks or Jira providers; instance remains in **`apps/jira-app/src/lib/axiosClient.ts`** for interceptors / **`refreshJiraAccessToken`** wired into **`jiraExtension`** / **`taskPlatform`**.

---

## 1. COMPLETED PHASES

Mapped to `migration-mvp-guide.md` (conceptual completion; the guide’s sample snippets may differ slightly from the implemented API, e.g. `getTasks(projectKey, options?)` instead of parameterless `getTasks()`).

| Guide section                                 | Status             | Notes                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PHASE 0** — Context (0.1–0.3)               | **Done**           | Codebase analysis, extensibility notes, and extraction framing were completed earlier in the migration (artifacts may live in chat/history rather than only in-repo).                                                   |
| **PHASE 1** — NX foundation (1.2–1.4)         | **Done**           | Nx workspace, `apps/jira-app`, `libs/*` layout, `tsconfig.base.json` path aliases, ESLint module boundaries, scripts/targets for the app.                                                                               |
| **PHASE 2.1** — App in Nx                     | **Done**           | Application lives under `apps/jira-app` with paths/env adjusted.                                                                                                                                                        |
| **PHASE 2.2** — Extract shared libs           | **Largely done**   | `libs/ui`, `libs/core`, `libs/data-access` contain migrated UI, shared query client, and Jira/service/types/adapters per prior extraction work. **Hooks** were not fully moved to `libs/core` (per boundary decisions). |
| **PHASE 2.4** — Provider interface            | **Done (evolved)** | `libs/platform`: `TaskPlatformProvider` with **`getProjects` / `getTasks` only** (minimal, platform-agnostic). Types: `PlatformProject`, `PlatformTask`, `GetTasksOptions`, etc.                                        |
| **PHASE 2.5** — Jira implements core provider | **Done**           | `libs/providers/jira`: `JiraTaskPlatformProvider` implements `TaskPlatformProvider` via BFF `/api/jira/*`.                                                                                                              |
| **PHASE 3.1** — Platform registry             | **Done**           | `PLATFORM_CONFIG` + `TaskPlatformId` in `libs/providers/jira` (Jira registered as the concrete core provider).                                                                                                          |
| **PHASE 3.2** — Dynamic injection             | **Done**           | `createTaskPlatformProvider` + `apps/jira-app/src/lib/task-platform.ts` (`NEXT_PUBLIC_TASK_PLATFORM`, token + refresh wiring).                                                                                          |

**Not fully completed per guide wording**

| Guide section                               | Status                                       | Notes                                                                                                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PHASE 2.3** — Isolate Jira provider       | **Partial**                                  | `libs/providers/jira/` exists and holds core + extension BFF logic; **React Jira providers** and some Jira-specific UX still live under `apps/jira-app` (intentional until hooks can move without violating “lib must not import app”).               |
| **PHASE 3.3** — Remove hardcoded Jira usage | **Done (hooks + Jira providers’ BFF calls)** | All Jira hooks under `apps/jira-app/src/hooks/` use **`taskPlatform`** / **`jiraExtension`**; Jira provider attachment uploads use **`jiraExtension`**. **`apiClient`** remains only in **`axiosClient.ts`** (interceptors / refresh). See section 2. |

**Not started (guide)**

- **PHASE 4** — Capability matrix (4.1–4.3)
- **PHASE 5** — Multi-app strategy (5.1+)
- **PHASE 6** — Generator system
- **PHASE 7+** — API discovery, scaling, hardening, etc.

---

## 2. PHASE 3.3 — HOOK + PROVIDER BFF MIGRATION (COMPLETE FOR `apps/jira-app`)

### Completed hooks migration

| Hook                      | Path                                                     | Mechanism                                                         |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `useJiraProjects`         | `apps/jira-app/src/hooks/useJiraProjects.ts`             | **`taskPlatform.getProjects()`**                                  |
| `useJiraProjectIssues`    | `apps/jira-app/src/hooks/useJiraProjectIssues.ts`        | **`taskPlatform.getTasks(...)`**                                  |
| `useProjectIssues`        | `apps/jira-app/src/hooks/useProjectIssues.ts`            | **`jiraExtension.getProjectIssuesPage(...)`**                     |
| `useIssueDetails`         | `apps/jira-app/src/hooks/useIssueDetails.ts`             | **`jiraExtension.getIssueDetails(...)`**                          |
| `useCreateJiraTask`       | `apps/jira-app/src/hooks/useCreateJiraTask.ts`           | **`jiraExtension.createIssue(...)`**                              |
| `useJiraAssignees`        | `apps/jira-app/src/hooks/useJiraAssignees.ts`            | **`jiraExtension.getAssignees(...)`**                             |
| `useProjectIssueStatuses` | `apps/jira-app/src/hooks/useProjectIssueStatuses.ts`     | **`jiraExtension.getProjectIssueStatuses(...)`**                  |
| `useIssueComments`        | `apps/jira-app/src/hooks/useIssueComments.ts`            | **`jiraExtension.getCommentsForIssue(...)`**                      |
| `useUpdateJiraTask`       | `apps/jira-app/src/hooks/useUpdateJiraTask.ts`           | **`jiraExtension.updateIssue(...)`**                              |
| `useIssueTransitions`     | `apps/jira-app/src/hooks/useIssueTransitions.ts`         | **`jiraExtension.getIssueTransitions(...)`**                      |
| `useIssueStatusChange`    | `apps/jira-app/src/hooks/useIssueStatusChange.ts`        | **`jiraExtension.transitionIssue(...)`**                          |
| `usePermission`           | `apps/jira-app/src/hooks/useIssuePermission.ts`          | **`jiraExtension.getIssuePermission(...)`**                       |
| `useCommentDetails`       | `apps/jira-app/src/hooks/useCommentDetails.ts`           | **`jiraExtension.getCommentDetails(...)`**                        |
| `useAddComment`           | `apps/jira-app/src/hooks/useAddComment.ts`               | **`jiraExtension.createComment(...)`**                            |
| `useDeleteIssue`          | `apps/jira-app/src/hooks/useDeleteIssue.ts`              | **`jiraExtension.deleteIssue(...)`**                              |
| `useOpenJiraAttachment`   | `apps/jira-app/src/hooks/useOpenJiraAttachment.ts`       | **`jiraExtension.getAttachmentBlob(...)`**                        |
| `useJiraSites`            | `apps/jira-app/src/hooks/useJiraSites.ts`                | **`jiraExtension.getJiraSites()`**                                |
| `useJiraSelectSite`       | `apps/jira-app/src/hooks/useJiraSelectSite.ts`           | **`jiraExtension.selectJiraSite(...)`**                           |
| `useJiraSelectProject`    | `apps/jira-app/src/hooks/useJiraSelectProject.ts`        | **`jiraExtension.selectJiraProject(...)`**                        |
| `useJiraPriorities`       | `apps/jira-app/src/hooks/useJiraPriorities.ts`           | **`jiraExtension.getProjectPriorities(...)`**                     |
| `useJiraIssueTypes`       | `apps/jira-app/src/hooks/useJiraIssueTypes.ts`           | **`jiraExtension.getIssueTypes(...)`**                            |
| `useJiraCurrentUser`      | `apps/jira-app/src/hooks/useJiraCurrentUser.ts`          | **`jiraExtension.getCurrentUser()`**                              |
| `useJiraConnectionStatus` | `apps/jira-app/src/hooks/useJiraConnectionStatus.ts`     | **`jiraExtension.getConnectionStatus()`**                         |
| `useDisconnectJira`       | `apps/jira-app/src/hooks/useJiraConnectionStatus.ts`     | **`jiraExtension.disconnectJira()`**                              |
| `useDeleteJiraAttachment` | `apps/jira-app/src/hooks/useDeleteJiraAttachment.ts`     | **`jiraExtension.deleteAttachment(...)`**                         |
| **Attachment upload**     | `JiraCreateTaskProvider.tsx`, `JiraEditTaskProvider.tsx` | **`jiraExtension.uploadAttachment(...)`** (95s `AbortController`) |

### Completed provider abstraction

- **`TaskPlatformProvider`** (`libs/platform`): listing-only contract for cross-platform reuse.
- **`JiraExtensionProvider`** (`libs/providers/jira/src/lib/jira-extension-provider.ts`): Jira-only operations **separate** from the core provider (Option B).
- **`JiraExtensionProviderImpl`** + **`createJiraExtensionProvider`**: factory for the extension layer.
- **App wiring**: `apps/jira-app/src/lib/jira-extension.ts` exports **`jiraExtension`** with the same Bearer + `onUnauthorized` / refresh pattern as `task-platform.ts`.

### Completed BFF + transport layer

- **`JiraBffClient`** (`libs/providers/jira/src/lib/jira-bff-client.ts`): shared `fetch` to **`/api/**`** (Jira + auth routes used by the extension) with `credentials`, optional Bearer, **one 401 retry** after `onUnauthorized`, and **no `Content-Type`** when **`body`** is **`FormData`\*\* (multipart uploads).
- **`JiraTaskPlatformProvider`** refactored to use **`JiraBffClient`** (no duplicate fetch/retry logic in the core Jira provider).
- BFF **`GET /api/jira/issues`** supports filter + text search via **`query`** → `JiraIssueFilters.text` → JQL (`libs/data-access` + route parsing) for parity with the issue picker.

### Completed registry/factory updates

- **`PLATFORM_CONFIG`** / **`createTaskPlatformProvider`** (`libs/providers/jira/src/lib/platform-registry.ts`).
- **Public exports** from `libs/providers/jira/src/index.ts`: core provider, extension factory/types, **`JiraBffClient`** / **`JiraBffTransportOptions`**, registry symbols.

---

## 3. PENDING WORK

### Jira hooks not migrated yet (still `apiClient`)

- **None** under `apps/jira-app/src/hooks/` (PHASE 3.3 hook migration complete for current hooks).

### Non-hook `apiClient` usage

- **`apps/jira-app/src/lib/axiosClient.ts`** only — **`apiClient`** definition, interceptors, and **`refreshJiraAccessToken`** used by **`jiraExtension`** / **`taskPlatform`** wiring (`onUnauthorized`).

### Missing `JiraExtensionProvider` methods

Implemented on **`JiraExtensionProvider`** (BFF via **`JiraBffClient`**), including **`/api/auth/jira/*`** where needed:

- Issues / comments / transitions / permissions / CRUD (batches 1–2)
- `getAttachmentBlob`, `uploadAttachment`, `deleteAttachment`
- `getJiraSites`, `selectJiraSite`, `selectJiraProject`, `getProjectPriorities`, `getIssueTypes`, `getCurrentUser`, `getConnectionStatus`, `disconnectJira`

Future endpoints (if new UI appears) should be added here the same way — **no** new transport layers.

### UI binding not started (PHASE 4)

- No **`Capability`** model / **`CAPABILITIES`** map wired to UI per guide steps 4.1–4.3.
- Related design notes may exist under `docs/versioned-capability-system.md` / checklist docs; **guide PHASE 4 is not implemented in app code** at this checkpoint.

### Capability engine not started

- Versioned capability system described in `docs/versioned-capability-system.md` is **out of scope** for this checkpoint; treat as **future** relative to `migration-mvp-guide.md` PHASE 4 unless explicitly merged into the same effort.

### Other guide phases (reminder)

- **PHASE 2.3** completion (move remaining Jira-only modules without breaking Nx boundaries).
- **PHASE 5–10** per `migration-mvp-guide.md` (multi-app, generators, API discovery, scaling, etc.).

---

## 4. ARCHITECTURE STATE

### Core provider status

- **`TaskPlatformProvider`** is intentionally **minimal**: **`getProjects`**, **`getTasks`** only.
- **`JiraTaskPlatformProvider`** is the **only** registered implementation in **`PLATFORM_CONFIG`** today (`jira` id).
- **`taskPlatform`** singleton: `apps/jira-app/src/lib/task-platform.ts`.

### Extension layer status

- **`JiraExtensionProvider`** is the **Jira-specific** BFF-facing API for issues/meta/CRUD slices that do not belong on the core interface.
- **`jiraExtension`** singleton: `apps/jira-app/src/lib/jira-extension.ts`.
- Intended rule: **Jira hooks that are not pure “list projects / list tasks for picker”** should eventually use **`jiraExtension` only**, not `apiClient`, and must **not** expand **`TaskPlatformProvider`** with Jira-only operations.

### Nx boundaries status

- **`libs/platform`**: no Jira imports; stable cross-platform types + `TaskPlatformProvider`.
- **`libs/providers/jira`**: may depend on **`@sai-mp-jira-task-view/platform`** and **`@sai-mp-jira-task-view/data-access`** per existing tag rules; **must not** import from `apps/*`.
- **`apps/jira-app`**: wires factories, holds Next routes, remaining providers/hooks, and **`apiClient`**.

### API layer status

- **BFF**: Next.js routes under `apps/jira-app/src/app/api/jira/**` (and auth routes) remain the system of record for browser → Jira.
- **Server/domain**: `libs/data-access` (e.g. `jiraService`, `JiraAdapter`, JQL builder) continues to back those routes.
- **Browser transport**: migrating from **`apiClient`** to **`JiraBffClient`** / **`taskPlatform`** / **`jiraExtension`** is **in progress**; **`apiClient`** remains required for unmigrated paths and interceptors.

---

## 5. LOCKED AREAS (DO NOT TOUCH)

Treat as **frozen** until an explicit “unlock” migration step is agreed (to avoid churn and regressions mid-checkpoint):

1. **`TaskPlatformProvider`** contract in **`libs/platform`** — **listing-only** (`getProjects`, `getTasks`). Do not add Jira-specific methods here.
2. **`JiraBffClient`** and **`JiraBffTransportOptions`** in **`libs/providers/jira/src/lib/jira-bff-client.ts`** — shared transport behavior (credentials, Bearer merge, 401 + retry).
3. **Registry + core factory** for **`TaskPlatformProvider`**: **`PLATFORM_CONFIG`**, **`TaskPlatformId`**, **`createTaskPlatformProvider`** (`libs/providers/jira/src/lib/platform-registry.ts`) and the **wiring pattern** in **`apps/jira-app/src/lib/task-platform.ts`** — unless a new platform is added in a deliberate, reviewed change.
4. **`JiraTaskPlatformProvider`** behavior for **`getProjects` / `getTasks`** as already shipped — change only for **bugs** or **cross-platform contract** adjustments, not for one-off Jira features (those belong on **`JiraExtensionProvider`**).

**Extension interface** (`JiraExtensionProvider`) is **not** locked: new methods are expected when resuming PHASE 3.3.

---

## 6. RISKS / TECH DEBT

| Risk                            | Detail                                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Remaining `apiClient` usage** | Confined to **`axiosClient.ts`** (axios instance for refresh and any legacy code outside this app slice). Feature hooks use **`jiraExtension`** / **`taskPlatform`** only.                                                    |
| **Partial hook migration**      | Resolved for **`apps/jira-app`** hooks; intentional split remains **`taskPlatform`** (listings) vs **`jiraExtension`** (Jira BFF).                                                                                            |
| **Duplicated Jira logic risk**  | Any new Jira BFF call added **outside** `JiraBffClient` / extension / core provider increases drift (retry policy, auth header rules, error parsing).                                                                         |
| **Guide vs code drift**         | `migration-mvp-guide.md` PHASE 2.4 sample still shows **`authenticate`** and parameterless **`getTasks`**; implementation intentionally differs — update the guide when resuming to avoid agents re-introducing removed APIs. |
| **`useOpenJiraAttachment` URL** | Previously risked double **`/api`** with axios **`baseURL`**; **`jiraExtension.getAttachmentBlob`** uses a single absolute path **`/api/jira/attachment/...`**.                                                               |
| **Auth routes on extension**    | `useJiraConnectionStatus` hits **`/auth/jira/*`** — extension naming implies Jira, but **auth/session** might deserve a separate small port later to keep **`JiraExtensionProvider`** focused on issue domain.                |

---

## Next instruction

**PHASE 3.3** Jira **`apiClient`** surface in **`apps/jira-app`** is complete for current hooks and Jira provider upload paths. Next: **`PHASE 4`** (capability matrix / UI binding) or **`PHASE 2.3`** (further isolate React Jira providers into libs when hooks/shared code allow), per `migration-mvp-guide.md`.
