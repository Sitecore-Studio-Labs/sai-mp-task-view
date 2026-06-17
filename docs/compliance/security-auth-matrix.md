# Security Evidence: Authentication & Authorization Matrix

> **Project:** sai-mp-jira-task-view (Next.js / TypeScript)
> **Generated:** 2026-04-03
> **Scope:** Per-endpoint authorization mapping, session validation, 401/403 behavior, tenant isolation, negative test coverage.

---

## 1. Authentication Mechanism

All authenticated endpoints use a shared helper: `getJiraUserIdFromSession()` (`src/helpers/jiraUserId.ts`).

**Flow:**

1. Read `jira_session_token` from request cookies
2. If missing or empty → return `null`
3. Query Supabase `jira_sessions` by `session_token` (exact match)
4. If no row found or DB error → return `null`
5. Parse `expires_at`; if invalid date or expired → return `null`
6. Return `jira_account_id` (the Atlassian user identifier)

**Cookie properties (set during OAuth callback):**

| Property | Value                                  |
| -------- | -------------------------------------- |
| Name     | `jira_session_token`                   |
| httpOnly | `true`                                 |
| secure   | `true`                                 |
| sameSite | `none` (required for iframe embedding) |
| path     | `/`                                    |
| expires  | 30 days from creation                  |

---

## 2. Endpoint Authorization Matrix

### Legend

- **Auth** — calls `getJiraUserIdFromSession()`
- **No-session response** — HTTP status + body when session is missing/invalid
- **JiraAuthError** — handles `JiraAuthError` with 401 + cookie clear
- **Connection check** — handles "No active Jira connection found for user." error
- **Tenant scoped** — DB queries / service calls filtered by `userId`

### Authenticated Endpoints

| Route                                         | Method | No-session response        | JiraAuthError → 401 | Connection check | Tenant scoped    |
| --------------------------------------------- | ------ | -------------------------- | ------------------- | ---------------- | ---------------- |
| `/api/auth/jira/status`                       | GET    | 200 `{ connected: false }` | Yes                 | Yes              | Yes              |
| `/api/auth/jira/refresh`                      | POST   | 401                        | Yes                 | No               | Yes              |
| `/api/auth/jira/disconnect`                   | POST   | 404                        | Yes                 | No               | Yes              |
| `/api/jira/issues`                            | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/issues`                            | POST   | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/issues/[issueIdOrKey]`             | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/issues/[issueIdOrKey]`             | PATCH  | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/issues/[issueIdOrKey]`             | DELETE | 404                        | No                  | No               | Yes              |
| `/api/jira/issues/[issueIdOrKey]/transitions` | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/issues/[issueIdOrKey]/transitions` | POST   | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/comments`                          | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/comments`                          | POST   | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/comments/[commentId]`              | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/projects`                          | GET    | 200 `{ error }`            | Yes                 | Yes              | Yes              |
| `/api/jira/priorities`                        | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/project-priorities`                | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/issue-types`                       | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/statuses/[projectKey]`             | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/assignees`                         | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/permissions`                       | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/sites`                             | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/select-site`                       | POST   | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/select-project`                    | POST   | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/current-user`                      | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/webhooks`                          | POST   | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/attachment/[attachmentId]`         | GET    | 404                        | Yes                 | Yes              | Yes              |
| `/api/jira/attachment/[attachmentId]`         | POST   | 404                        | No                  | Yes              | Yes              |
| `/api/jira/attachment/[attachmentId]`         | DELETE | 404                        | No                  | Yes              | Yes              |
| `/api/workbreakdown/[draftId]/publish`        | POST   | 404                        | Yes                 | Yes              | Yes (Jira calls) |

### Unauthenticated Endpoints (by design)

| Route                          | Method     | Reason                                                   | Tenant scoped           |
| ------------------------------ | ---------- | -------------------------------------------------------- | ----------------------- |
| `/api/auth/jira/connect`       | GET        | Initiates OAuth flow                                     | N/A                     |
| `/api/auth/jira/callback`      | GET        | Receives OAuth callback (validates `state` cookie)       | N/A                     |
| `/api/webhooks/jira`           | POST       | Inbound Jira events (verified via `JIRA_WEBHOOK_SECRET`) | No (shared event log)   |
| `/api/jira/sync-signal`        | GET        | Polls latest webhook timestamp by `projectKey`           | No (shared event log)   |
| `/api/workbreakdown`           | POST       | Draft creation (ephemeral in-memory)                     | No (keyed by `draftId`) |
| `/api/workbreakdown/[draftId]` | GET, PATCH | Draft CRUD (ephemeral in-memory)                         | No (keyed by `draftId`) |
| `/api/ai/parse-requirements`   | POST       | AI text parsing (no user data)                           | No                      |

---

## 3. Error Response Behavior

### When session is missing/invalid (not authenticated)

All authenticated routes follow one of two patterns:

- **Pattern A (majority):** Returns `404` with `{ error: "No active Jira connection." }`
- **Pattern B (status):** Returns `200` with `{ connected: false }` (graceful for UI polling)
- **Pattern C (refresh):** Returns `401` with `{ error: "No active Jira connection." }`

### When Jira token is expired/revoked (JiraAuthError)

Consistent across all routes that handle it:

1. Calls `clearJiraCookie()` to expire the session cookie
2. Returns `401` with `{ error: "<JiraAuthError message>" }`

### When connection row is missing/inactive

Routes that check for the `"No active Jira connection found for user."` message:

1. Call `clearJiraCookie()`
2. Return `401` with `{ error: "No active Jira connection." }`

---

## 4. Tenant Isolation Enforcement

### Data flow

```
Browser cookie (jira_session_token)
    → getJiraUserIdFromSession() → jira_account_id
    → service layer → .eq("user_id", jira_account_id)
    → Supabase PostgREST (parameterized)
```

### Key properties

1. **Session tokens are cryptographically random** — `crypto.randomBytes(32).toString("hex")` (256-bit)
2. **One active session per Jira account** — `createJiraSession()` deletes prior sessions before inserting
3. **All connection/token queries scoped** — `jira_connections` always filtered by `user_id`
4. **Tokens encrypted at rest** — AES-256-GCM; decryption requires server-side `JIRA_CLIENT_SECRET`
5. **No admin bypass** — no superuser routes or role escalation paths exist

### Cross-tenant access prevention

User A cannot access User B's data because:

- User A's session cookie resolves to User A's `jira_account_id`
- All Supabase queries filter by that `jira_account_id`
- Even if User A knew User B's `jira_account_id`, they cannot inject it — the identity comes exclusively from the server-side session lookup

---

## 5. Negative Test Coverage

### 5.1 `getJiraUserIdFromSession` helper tests

Tests in `src/test/__tests__/helpers/getJiraUserIdFromSession.spec.ts`:

| Test case                              | Expected result           |
| -------------------------------------- | ------------------------- |
| No `jira_session_token` cookie         | Returns `null`            |
| Empty cookie value                     | Returns `null`            |
| Cookie present, no matching DB row     | Returns `null`            |
| Cookie present, DB query error         | Returns `null`            |
| Valid token, session expired           | Returns `null`            |
| Valid token, invalid `expires_at` date | Returns `null`            |
| Valid token, active session            | Returns `jira_account_id` |

### 5.2 Route-level auth rejection tests

Tests in `src/test/__tests__/jira/auth-negative.spec.ts` covering representative routes:

| Route                                   | Test case                         | Expected             |
| --------------------------------------- | --------------------------------- | -------------------- |
| `POST /api/auth/jira/disconnect`        | No session                        | 404                  |
| `POST /api/auth/jira/disconnect`        | JiraAuthError from service        | 401 + cookie cleared |
| `GET /api/jira/comments?issueIdOrKey=X` | No session                        | 404                  |
| `POST /api/jira/comments`               | No session                        | 404                  |
| `POST /api/jira/select-site`            | No session                        | 404                  |
| `POST /api/jira/select-project`         | No session                        | 404                  |
| `POST /api/jira/issues/X/transitions`   | No session                        | 404                  |
| `GET /api/jira/sites`                   | No session                        | 404                  |
| Multiple routes                         | JiraAuthError                     | 401 + cookie cleared |
| Multiple routes                         | "No active Jira connection" error | 401 + cookie cleared |

### 5.3 Existing test coverage (prior to this effort)

| Test file                   | Routes covered                | Negative auth cases                                           |
| --------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `auth-jira-status.spec.ts`  | `GET /api/auth/jira/status`   | No userId → `{ connected: false }`; JiraAuthError → 401       |
| `auth-jira-refresh.spec.ts` | `POST /api/auth/jira/refresh` | No userId → 401; JiraAuthError → 401                          |
| `jira-projects.spec.ts`     | `GET /api/jira/projects`      | No userId → 200 error; JiraAuthError → 401                    |
| `jira-issues-get.spec.ts`   | `GET /api/jira/issues`        | No session → 404; JiraAuthError → 401; connection error → 401 |
| `jira-issues-post.spec.ts`  | `POST /api/jira/issues`       | No session → 404; JiraAuthError → 401; connection error → 401 |

### 5.4 E2E coverage

Auth scenarios are implemented as scenario modules under `apps/jira-e2e/src/scenarios/` (run via `nx run jira-e2e:e2e` or `nx affected --target=e2e`):

| Scenario module          | Auth scenario                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `connect-platform.ts`    | No session → disconnected UI; simulated OAuth sets `jira_session_token` cookie and connected state   |
| `disconnect-platform.ts` | Cancel disconnect preserves session; confirm disconnect clears cookie; reconnect via simulated OAuth |
