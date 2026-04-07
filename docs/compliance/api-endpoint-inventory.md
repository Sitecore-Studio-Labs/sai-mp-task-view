# API Endpoint Inventory

> **Project:** sai-mp-jira-task-view (Next.js App Router)
> **Updated:** 2026-04-06
> **Purpose:** Single inventory of HTTP test surfaces under `src/app/api/**/route.ts` for security reviews and test planning.

Routes follow the filesystem: `src/app/api/foo/bar/route.ts` → `/api/foo/bar`. Dynamic segments appear as `[param]` in the table (URL: `:param`).

## Auth / exposure legend

| Class              | Meaning                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Jira session**   | Requires active Jira OAuth session (`getJiraUserIdFromSession` or equivalent).      |
| **OAuth redirect** | Browser OAuth start or callback (state/cookie expectations).                        |
| **None**           | No application-level user authentication on the handler.                            |
| **External POST**  | Intended for Jira Cloud webhook calls. No signature verification in app code today. |

## Endpoints

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

## Risk-focused notes

- **Draft APIs (`/api/workbreakdown*`)** — No user binding; drafts are keyed only by server-generated IDs in the current in-memory store. Treat as a test surface for abuse of unauthenticated write/read if exposed on a shared host.
- **`/api/jira/sync-signal`** — Unauthenticated read of latest webhook timestamp per `projectKey`; low sensitivity but enumerable if project keys are guessable.
- **`/api/webhooks/jira`** — Public POST endpoint; rely on Jira configuration, network controls, and optional platform signing (not implemented in handler) per deployment policy.
- **Token and secrets handling** — See [security-source-code-and-secrets.md](./security-source-code-and-secrets.md) and `src/utils/encryption.ts`.

## Maintenance

When adding `route.ts` files under `src/app/api`, update this table in the same PR.
