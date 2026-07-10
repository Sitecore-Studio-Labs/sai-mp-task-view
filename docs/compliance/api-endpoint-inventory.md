# API Endpoint Inventory

> **Project:** sai-mp-jira-task-view (Next.js App Router)
> **Updated:** 2026-07-08
> **Purpose:** Single inventory of HTTP test surfaces under `src/app/api/**/route.ts` for security reviews and test planning.

Routes follow the filesystem: `src/app/api/foo/bar/route.ts` → `/api/foo/bar`. Dynamic segments appear as `[param]` in the table (URL: `:param`).

## Auth / exposure legend

| Class              | Meaning                                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Jira session**   | Requires active Jira OAuth session (`getJiraUserIdFromSession` or equivalent).       |
| **Wrike session**  | Requires active Wrike OAuth session (`getWrikeUserIdFromSession` or equivalent).     |
| **OAuth redirect** | Browser OAuth start or callback (state/cookie expectations).                         |
| **None**           | No application-level user authentication on the handler.                             |
| **External POST**  | Intended for platform webhook calls. Signature verification optional via env secret. |
| **Dev only**       | Returns 404 outside `NODE_ENV=development`.                                          |

## Jira endpoints (`apps/jira`)

| Path                                          | Methods            | Auth                                             | Summary                                                      |
| --------------------------------------------- | ------------------ | ------------------------------------------------ | ------------------------------------------------------------ |
| `/api/ai/parse-requirements`                  | POST               | Jira session                                     | Parses requirements via OpenAI when configured.              |
| `/api/auth/jira/callback`                     | GET                | OAuth redirect                                   | OAuth 2.0 callback; exchanges code for tokens.               |
| `/api/auth/jira/connect`                      | GET                | OAuth redirect                                   | Redirects user to Jira authorization.                        |
| `/api/auth/jira/disconnect`                   | POST               | Jira session                                     | Clears Jira connection.                                      |
| `/api/auth/jira/refresh`                      | POST               | Jira session                                     | Refreshes OAuth tokens.                                      |
| `/api/auth/jira/status`                       | GET                | None (returns `connected: false` without cookie) | Connection status when Jira session cookie present.          |
| `/api/jira/assignees`                         | GET                | Jira session                                     | Assignable users for a project.                              |
| `/api/jira/attachment/[attachmentId]`         | GET, POST, DELETE  | Jira session                                     | Jira attachment proxy.                                       |
| `/api/jira/comments`                          | GET, POST          | Jira session                                     | List/create comments.                                        |
| `/api/jira/comments/[commentId]`              | GET                | Jira session                                     | Single comment.                                              |
| `/api/jira/current-user`                      | GET                | Jira session                                     | Current Jira user profile.                                   |
| `/api/jira/issue-types`                       | GET                | Jira session                                     | Issue types for `projectId` query param.                     |
| `/api/jira/issues`                            | GET, POST          | Jira session                                     | List/create issues.                                          |
| `/api/jira/issues/[issueIdOrKey]`             | GET, PATCH, DELETE | Jira session                                     | Issue CRUD.                                                  |
| `/api/jira/issues/[issueIdOrKey]/transitions` | GET, POST          | Jira session                                     | Workflow transitions.                                        |
| `/api/jira/permissions`                       | GET                | Jira session                                     | Project permissions check.                                   |
| `/api/jira/priorities`                        | GET                | Jira session                                     | Global priorities.                                           |
| `/api/jira/project-priorities`                | GET                | Jira session                                     | Priorities for a project.                                    |
| `/api/jira/projects`                          | GET                | Jira session                                     | Accessible projects.                                         |
| `/api/jira/select-project`                    | POST               | Jira session                                     | Persist selected project.                                    |
| `/api/jira/select-site`                       | POST               | Jira session                                     | Persist selected Jira site.                                  |
| `/api/jira/sites`                             | GET                | Jira session                                     | Sites + connection metadata.                                 |
| `/api/jira/statuses/[projectKey]`             | GET                | Jira session                                     | Statuses for project.                                        |
| `/api/jira/sync-signal`                       | GET                | None                                             | Latest webhook event time for `projectKey` (reads Supabase). |
| `/api/jira/webhooks`                          | POST               | Jira session                                     | Registers dynamic webhooks via Jira API.                     |
| `/api/webhooks/jira`                          | POST               | External POST                                    | Inbound Jira webhook handler (persists events).              |
| `/api/workbreakdown`                          | POST               | None                                             | Creates in-memory work-breakdown draft.                      |
| `/api/workbreakdown/[draftId]`                | GET, PATCH         | None                                             | Read/update draft by ID (in-memory store).                   |
| `/api/workbreakdown/[draftId]/publish`        | POST               | Jira session                                     | Publishes draft to Jira.                                     |

## Wrike endpoints (`apps/wrike`)

| Path                                           | Methods            | Auth                                             | Summary                                                               |
| ---------------------------------------------- | ------------------ | ------------------------------------------------ | --------------------------------------------------------------------- |
| `/api/auth/wrike/callback`                     | GET                | OAuth redirect                                   | OAuth 2.0 callback; exchanges code for tokens.                        |
| `/api/auth/wrike/connect`                      | GET                | OAuth redirect                                   | Redirects user to Wrike authorization.                                |
| `/api/auth/wrike/disconnect`                   | POST               | Wrike session (optional)                         | Revokes token when session present; always clears cookie.             |
| `/api/auth/wrike/refresh`                      | POST               | Wrike session                                    | Refreshes OAuth tokens.                                               |
| `/api/auth/wrike/status`                       | GET                | None (returns `connected: false` without cookie) | Connection status when Wrike session cookie present.                  |
| `/api/dev/setup-status`                        | GET                | Dev only                                         | Implementation checklist for local development.                       |
| `/api/setup`                                   | GET, POST          | Wrike session (GET graceful without session)     | Setup wizard state; GET returns `{ connected: false }` if no session. |
| `/api/setup/complete`                          | POST               | Wrike session                                    | Marks setup wizard complete.                                          |
| `/api/setup/mappings`                          | GET, PUT           | Wrike session                                    | Sitecore site → Wrike folder mappings.                                |
| `/api/wrike/assignees`                         | GET                | Wrike session                                    | Assignable users for a project.                                       |
| `/api/wrike/attachment/[attachmentId]`         | GET, DELETE        | Wrike session                                    | Wrike attachment proxy.                                               |
| `/api/wrike/comments`                          | GET, POST          | Wrike session                                    | List/create comments.                                                 |
| `/api/wrike/current-user`                      | GET                | Wrike session                                    | Current Wrike user profile.                                           |
| `/api/wrike/issues`                            | GET, POST          | Wrike session                                    | List/create tasks.                                                    |
| `/api/wrike/issues/[issueIdOrKey]`             | GET, PATCH, DELETE | Wrike session                                    | Task CRUD.                                                            |
| `/api/wrike/issues/[issueIdOrKey]/attachments` | POST               | Wrike session                                    | Upload attachment to task.                                            |
| `/api/wrike/issues/[issueIdOrKey]/transitions` | GET, POST          | Wrike session                                    | Workflow status transitions.                                          |
| `/api/wrike/permissions`                       | GET                | Wrike session                                    | Project permissions check.                                            |
| `/api/wrike/project-priorities`                | GET                | Wrike session                                    | Priorities for a project.                                             |
| `/api/wrike/projects`                          | GET                | Wrike session (`emptyOnNoAuth`)                  | Accessible folders; returns `[]` without session.                     |
| `/api/wrike/select-project`                    | POST               | Wrike session                                    | Persist selected default folder.                                      |
| `/api/wrike/statuses/[projectKey]`             | GET                | Wrike session                                    | Statuses for project.                                                 |

## Risk-focused notes

- **Draft APIs (`/api/workbreakdown*`)** — No user binding; drafts are keyed only by server-generated IDs in the current in-memory store. Treat as a test surface for abuse of unauthenticated write/read if exposed on a shared host.
- **`/api/jira/sync-signal`** — Unauthenticated read of latest webhook timestamp per `projectKey`; low sensitivity but enumerable if project keys are guessable.
- **`/api/webhooks/jira`** — Public POST endpoint; rely on Jira configuration, network controls, and optional platform signing (not implemented in handler) per deployment policy.
- **`/api/wrike/projects`** — Uses `emptyOnNoAuth`: returns `[]` instead of 401 when no session, so the UI can poll before connect.
- **Token and secrets handling** — See [security-source-code-and-secrets.md](./security-source-code-and-secrets.md) and `libs/shared/src/lib/encryption.ts`.

## Maintenance

When adding `route.ts` files under `apps/jira/src/app/api` or `apps/wrike/src/app/api`, update this table in the same PR.
