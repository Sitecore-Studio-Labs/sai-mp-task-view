# MIGRATION STATE REPORT

This document maps progress to `migration-mvp-guide.md` and is descriptive only; it does not prescribe new work beyond what the guide already defines.

**Last checkpoint update:** PHASE 3.3 **batch 1** — assignees, project statuses, issue comments list, issue update (PATCH), issue transitions; shared type **`JiraIssueTransition`** moved to `libs/data-access` (`@/types/jira`).

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

| Guide section                               | Status      | Notes                                                                                                                                                                                                                                   |
| ------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PHASE 2.3** — Isolate Jira provider       | **Partial** | `libs/providers/jira/` exists and holds core + extension BFF logic; **React Jira providers** and some Jira-specific UX still live under `apps/jira-app` (intentional until hooks can move without violating “lib must not import app”). |
| **PHASE 3.3** — Remove hardcoded Jira usage | **Partial** | See section 2.                                                                                                                                                                                                                          |

**Not started (guide)**

- **PHASE 4** — Capability matrix (4.1–4.3)
- **PHASE 5** — Multi-app strategy (5.1+)
- **PHASE 6** — Generator system
- **PHASE 7+** — API discovery, scaling, hardening, etc.

---

## 2. PARTIALLY COMPLETED (PHASE 3.3)

### Completed hooks migration

| Hook                      | Path                                                 | Mechanism                                        |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `useJiraProjects`         | `apps/jira-app/src/hooks/useJiraProjects.ts`         | **`taskPlatform.getProjects()`**                 |
| `useJiraProjectIssues`    | `apps/jira-app/src/hooks/useJiraProjectIssues.ts`    | **`taskPlatform.getTasks(...)`**                 |
| `useProjectIssues`        | `apps/jira-app/src/hooks/useProjectIssues.ts`        | **`jiraExtension.getProjectIssuesPage(...)`**    |
| `useIssueDetails`         | `apps/jira-app/src/hooks/useIssueDetails.ts`         | **`jiraExtension.getIssueDetails(...)`**         |
| `useCreateJiraTask`       | `apps/jira-app/src/hooks/useCreateJiraTask.ts`       | **`jiraExtension.createIssue(...)`**             |
| `useJiraAssignees`        | `apps/jira-app/src/hooks/useJiraAssignees.ts`        | **`jiraExtension.getAssignees(...)`**            |
| `useProjectIssueStatuses` | `apps/jira-app/src/hooks/useProjectIssueStatuses.ts` | **`jiraExtension.getProjectIssueStatuses(...)`** |
| `useIssueComments`        | `apps/jira-app/src/hooks/useIssueComments.ts`        | **`jiraExtension.getCommentsForIssue(...)`**     |
| `useUpdateJiraTask`       | `apps/jira-app/src/hooks/useUpdateJiraTask.ts`       | **`jiraExtension.updateIssue(...)`**             |
| `useIssueTransitions`     | `apps/jira-app/src/hooks/useIssueTransitions.ts`     | **`jiraExtension.getIssueTransitions(...)`**     |

### Completed provider abstraction

- **`TaskPlatformProvider`** (`libs/platform`): listing-only contract for cross-platform reuse.
- **`JiraExtensionProvider`** (`libs/providers/jira/src/lib/jira-extension-provider.ts`): Jira-only operations **separate** from the core provider (Option B).
- **`JiraExtensionProviderImpl`** + **`createJiraExtensionProvider`**: factory for the extension layer.
- **App wiring**: `apps/jira-app/src/lib/jira-extension.ts` exports **`jiraExtension`** with the same Bearer + `onUnauthorized` / refresh pattern as `task-platform.ts`.

### Completed BFF + transport layer

- **`JiraBffClient`** (`libs/providers/jira/src/lib/jira-bff-client.ts`): shared `fetch` to `/api/jira/*` with `credentials`, optional Bearer, and **one 401 retry** after `onUnauthorized`.
- **`JiraTaskPlatformProvider`** refactored to use **`JiraBffClient`** (no duplicate fetch/retry logic in the core Jira provider).
- BFF **`GET /api/jira/issues`** supports filter + text search via **`query`** → `JiraIssueFilters.text` → JQL (`libs/data-access` + route parsing) for parity with the issue picker.

### Completed registry/factory updates

- **`PLATFORM_CONFIG`** / **`createTaskPlatformProvider`** (`libs/providers/jira/src/lib/platform-registry.ts`).
- **Public exports** from `libs/providers/jira/src/index.ts`: core provider, extension factory/types, **`JiraBffClient`** / **`JiraBffTransportOptions`**, registry symbols.

---

## 3. PENDING WORK

### Jira hooks not migrated yet (still `apiClient`)

All under `apps/jira-app/src/hooks/` unless noted:

- `useOpenJiraAttachment` (also uses a non-`/api`-prefixed path segment; worth review when migrating)
- `useJiraSites`
- `useJiraSelectSite`
- `useJiraSelectProject`
- `useJiraPriorities`
- `useJiraIssueTypes`
- `useJiraCurrentUser`
- `useJiraConnectionStatus` (uses `/auth/jira/*`, not only `/jira/*`)
- `useIssueStatusChange`
- `useIssuePermission`
- `useCommentDetails`
- `useAddComment`
- `useDeleteJiraAttachment`
- `useDeleteIssue`

### Non-hook `apiClient` usage

- `apps/jira-app/src/providers/create-task/JiraCreateTaskProvider.tsx`
- `apps/jira-app/src/providers/edit-task/JiraEditTaskProvider.tsx`
- `apps/jira-app/src/lib/axiosClient.ts` (definition + shared interceptors; expected to remain for migrated and unmigrated callers until Phase 3.3 is finished)

### Missing `JiraExtensionProvider` methods

Implemented on **`JiraExtensionProvider`** (BFF via **`JiraBffClient`**):

- `getProjectIssuesPage`, `getIssueDetails`, `createIssue`
- `getAssignees`, `getProjectIssueStatuses`, `getCommentsForIssue`, `updateIssue`, `getIssueTransitions`

Still needed for remaining hooks / providers (examples — map 1:1 to routes under `apps/jira-app/src/app/api/jira/**` and `/api/auth/jira/**` as appropriate):

- Transitions **POST**, permissions, single comment GET, add/delete comment, delete issue, delete attachment, attachment download/stream, priorities, issue types, current user, sites / select-site / select-project, connection status / disconnect, etc.

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

| Risk                            | Detail                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Remaining `apiClient` usage** | Many hooks + two Jira React providers still call **`apiClient`** directly → **dual transport** (axios interceptors vs `JiraBffClient`) until migration completes; subtle differences in error handling, headers, or URL shape. |
| **Partial hook migration**      | Mix of **`taskPlatform`**, **`jiraExtension`**, and **`apiClient`** increases cognitive load and makes “all Jira UI goes through providers” easy to violate accidentally.                                                      |
| **Duplicated Jira logic risk**  | Any new Jira BFF call added **outside** `JiraBffClient` / extension / core provider increases drift (retry policy, auth header rules, error parsing).                                                                          |
| **Guide vs code drift**         | `migration-mvp-guide.md` PHASE 2.4 sample still shows **`authenticate`** and parameterless **`getTasks`**; implementation intentionally differs — update the guide when resuming to avoid agents re-introducing removed APIs.  |
| **`useOpenJiraAttachment` URL** | Uses **`/api/jira/attachment/...`** while `apiClient` **`baseURL`** is **`/api`** — verify at runtime / tests when migrating to `JiraBffClient` to avoid double `/api` or wrong paths.                                         |
| **Auth routes on extension**    | `useJiraConnectionStatus` hits **`/auth/jira/*`** — extension naming implies Jira, but **auth/session** might deserve a separate small port later to keep **`JiraExtensionProvider`** focused on issue domain.                 |

---

## Next instruction

**PHASE 3.3 implementation is stopped** at this checkpoint. Resume only after reviewing this report and explicitly unlocking the areas in section 5 where changes are allowed.
