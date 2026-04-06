# Security Controls — Evidence from Repository

> **Last updated:** 2026-04-03

This document provides verifiable, file-referenced evidence of security controls implemented in the codebase: input validation/sanitization, tenant isolation, error handling (no token leakage), security-relevant business logic, secure development environment controls, and pen testing / DAST posture.

---

## Table of Contents

1. [Input Validation & Sanitization](#1-input-validation--sanitization)
2. [Tenant Isolation Mechanics](#2-tenant-isolation-mechanics)
3. [Error Handling — No Token Leakage](#3-error-handling--no-token-leakage)
4. [Security-Relevant Business Logic](#4-security-relevant-business-logic)
5. [Secure Dev Environment Controls (RBAC / Least Privilege)](#5-secure-dev-environment-controls-rbac--least-privilege)
6. [Pen Testing / DAST & Remediation Tracking](#6-pen-testing--dast--remediation-tracking)
7. [Gaps & Recommendations](#7-gaps--recommendations)

---

## 1. Input Validation & Sanitization

### 1.1 Schema Validation Library — Zod

The application uses **Zod** (`^4.3.6`) for structural/type validation on both client and server.

| Schema                | File                                                                               | Used By                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `taskFormSchema`      | [`src/schemas/task-form-schema.ts`](../../src/schemas/task-form-schema.ts)         | `CreateTaskView`, `EditTaskView` via `zodResolver`                                                       |
| `workBreakdownSchema` | [`src/schemas/workbreakdown-schema.ts`](../../src/schemas/workbreakdown-schema.ts) | `POST /api/workbreakdown` via `safeParse`                                                                |
| `aiOutputSchema`      | [`src/schemas/workbreakdown-schema.ts`](../../src/schemas/workbreakdown-schema.ts) | `parseAiWorkBreakdown()` in [`src/lib/ai-parse-requirements.ts`](../../src/lib/ai-parse-requirements.ts) |

**Server-side Zod validation example** — `POST /api/workbreakdown`:

```typescript
// src/app/api/workbreakdown/route.ts (lines 12-35)
const parsed = workBreakdownSchema.safeParse({ ...body, id, createdAt, updatedAt });
if (!parsed.success) {
  return NextResponse.json(
    { error: "Validation failed.", details: parsed.error.flatten() },
    { status: 422 },
  );
}
```

### 1.2 Manual API Route Validation

Every API route under `src/app/api/` performs explicit input checks before processing:

| Route                                       | Validation Performed                                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/jira/issues`                     | `typeof` + truthy checks on `projectId`, `issueTypeId`, `summary`; regex `^\d{4}-\d{2}-\d{2}` for `dueDate`; `Date` parse fallback; trim on strings |
| `PATCH /api/jira/issues/[id]`               | Per-field `typeof` + trim/null rules for `summary`, `description`, `priority`, `dueDate`, `assignee`                                                |
| `POST /api/jira/comments`                   | `!body.text` presence check                                                                                                                         |
| `POST /api/jira/select-project`             | JSON parse + `projectKey` presence                                                                                                                  |
| `POST /api/jira/select-site`                | JSON parse + `cloudId` presence                                                                                                                     |
| `GET /api/jira/permissions`                 | `permission` required; mutual exclusion of `issueIdOrKey` / `projectKey`                                                                            |
| `GET /api/jira/issue-types`                 | `projectId` query required                                                                                                                          |
| `POST /api/ai/parse-requirements`           | `requirementText` type + presence                                                                                                                   |
| `POST /api/jira/attachment/[id]`            | `file instanceof File` check                                                                                                                        |
| `POST /api/jira/sync-signal`                | `projectKey` required, trimmed                                                                                                                      |
| `GET /api/auth/jira/callback`               | `code` query param required                                                                                                                         |
| `POST /api/webhooks/jira`                   | `typeof body === "object"`; nested string checks for `webhookEvent`, `issue.key`, `project.key`                                                     |
| `PATCH /api/workbreakdown/[draftId]`        | Operation-specific `itemId` / `item.type` checks                                                                                                    |
| `POST /api/workbreakdown/[draftId]/publish` | `projectId` must be non-empty string                                                                                                                |

**Representative example** — `POST /api/jira/issues` (`src/app/api/jira/issues/route.ts`, lines 82–143):

```typescript
if (typeof projectId !== "string" || !projectId) {
  return NextResponse.json(
    { error: "Missing or invalid body field: projectId (string)." },
    { status: 400 },
  );
}
// ... dueDate regex + Date parse validation ...
if (typeof dueDate === "string" && dueDate.trim()) {
  const isYmd = /^\d{4}-\d{2}-\d{2}/.test(trimmed);
  const d = new Date(trimmed);
  if (!isYmd && Number.isNaN(d.getTime())) {
    return NextResponse.json(
      { error: "Invalid body field: dueDate (expected ISO date/datetime string)." },
      { status: 400 },
    );
  }
}
```

### 1.3 JQL Injection Prevention

User-supplied filter values are escaped before embedding in JQL queries:

**File:** [`src/lib/jqlBuilder.ts`](../../src/lib/jqlBuilder.ts) (lines 3–5)

```typescript
function escapeJqlValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
```

All `buildProjectIssuesJql` calls wrap `projectKey`, `assignee`, `priority`, and `status` values through this escaper. Unit tests in `src/lib/__tests__/jqlBuilder.spec.ts` verify escaping behavior.

### 1.4 File Upload Validation

**File:** [`src/components/tasks/task-form/create-task-utils.ts`](../../src/components/tasks/task-form/create-task-utils.ts) (lines 13–67)

| Control                 | Detail                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| **Max size**            | 50 MB (`MAX_ATTACHMENT_SIZE_BYTES`)                                                           |
| **Allowed extensions**  | Explicit allowlist of 24 safe types (images, documents, archives)                             |
| **Blocked extensions**  | Explicit blocklist: `exe`, `bat`, `cmd`, `sh`, `ps1`, `vbs`, `js`, `jar`, `msi`, `dll`, `scr` |
| **Validation function** | `validateAttachmentFile(file)` returns `null` on success or a human-readable error message    |

### 1.5 HTML/Description Handling

Descriptions containing HTML (`<` / `>` detected) are converted to Atlassian Document Format (ADF) via `@razroo/html-to-adf` — structured conversion, not raw HTML insertion into Jira.

**File:** [`src/platforms/jira/JiraAdapter.ts`](../../src/platforms/jira/JiraAdapter.ts) (lines 331–394)

### 1.6 AI Output Validation (AI integartion is currently disabled)

AI-generated work breakdowns pass through a multi-stage pipeline:

1. **JSON extraction** with regex stripping of markdown fences — `extractJsonFromResponse()` in `src/lib/ai-parse-requirements.ts`
2. **Structural normalization** — `normalizeAiOutput()` with `typeof` / array checks, valid type enum (`VALID_TYPES`)
3. **Zod schema validation** — `aiOutputSchema.parse()` enforces structure
4. **Business normalization** — `validateAndNormalize()` in `src/lib/workbreakdown-normalize.ts` applies `trim()`, default values, and minimum-item constraints

---

## 2. Tenant Isolation Mechanics

### 2.1 Isolation Model

The application implements **per–Jira-account isolation** (not multi-tenant organization model). Each user's data is scoped by their Atlassian `accountId`, stored as `user_id` in `jira_connections` and `jira_account_id` in `jira_sessions`.

### 2.2 Session-Based Identity Resolution

Every API route resolves the current user via `getJiraUserIdFromSession()`:

**File:** [`src/helpers/jiraUserId.ts`](../../src/helpers/jiraUserId.ts) (lines 5–29)

```typescript
export async function getJiraUserIdFromSession(request: NextRequest) {
  const sessionToken = request.cookies.get("jira_session_token")?.value || "";
  if (!sessionToken) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_sessions")
    .select("jira_account_id, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error || !data) return null;
  // Expiry validation ...
  if (expiresAt.getTime() < Date.now()) return null;

  return data.jira_account_id;
}
```

**Routes using this gate (22 routes):** All routes under `src/app/api/jira/**`, `src/app/api/auth/jira/status|refresh|disconnect`, and `src/app/api/workbreakdown/[draftId]/publish`.

### 2.3 Database-Level Scoping

All database queries for user-specific data include `user_id` or `jira_account_id` filters:

**File:** [`src/services/jiraService.ts`](../../src/services/jiraService.ts)

```typescript
// Connection lookup (line 47)
.eq("user_id", userId).eq("status", "active").single();

// Connection existence check (line 35)
.eq("user_id", userId).eq("status", "active").maybeSingle();

// Session cleanup before new session (line 175)
await supabase.from("jira_sessions").delete().eq("jira_account_id", jiraAccountId);
```

The `jira_connections` table enforces `unique (user_id)`, preventing cross-user token collision.

### 2.4 Row-Level Security (RLS)

**File:** [`supabase/schema.sql`](../../supabase/schema.sql) (lines 59–64)

```sql
alter table public.jira_webhook_events enable row level security;

create policy "Allow read for sync"
  on public.jira_webhook_events for select
  using (true);
```

RLS is enabled on `jira_webhook_events`. The `SELECT` policy is intentionally broad because this table contains only non-sensitive metadata (issue keys, project keys, event type). Client-side Realtime subscriptions filter by `project_key` in `useJiraWebhookSync.ts`.

### 2.5 Supabase Client Separation

**File:** [`src/lib/supabaseClient.ts`](../../src/lib/supabaseClient.ts) (lines 1–42)

| Client                         | Key                             | Scope                                                                    |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------ |
| `supabaseBrowserClient`        | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser only — limited permissions, subject to RLS                       |
| `createSupabaseServerClient()` | `SUPABASE_SERVICE_ROLE_KEY`     | Server only — API routes and server components; never exposed to browser |

The server client explicitly sets `persistSession: false` to prevent session leakage across requests.

---

## 3. Error Handling — No Token Leakage

### 3.1 Error Classification Architecture

The application uses a two-class error system to prevent credential leakage:

| Error Class       | File                                                                                         | Purpose                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `JiraAuthError`   | [`src/exceptions/jiraErrors.ts`](../../src/exceptions/jiraErrors.ts)                         | Authentication failures — uses safe default message                                                                                  |
| `JiraClientError` | [`src/platforms/jira/JiraAdapter.ts`](../../src/platforms/jira/JiraAdapter.ts) (lines 29–39) | Jira API 4xx errors — message extracted via `formatJiraErrorResponse()` (only `errorMessages` / `errors` fields, never raw payloads) |

### 3.2 Safe Default Error Messages

`JiraAuthError` always defaults to a generic message:

```typescript
// src/exceptions/jiraErrors.ts
export class JiraAuthError extends Error {
  constructor(message = "Jira session has expired. Please reconnect Jira.") {
    super(message);
    this.name = "JiraAuthError";
  }
}
```

### 3.3 Jira Response Sanitization

Raw Jira API error responses are parsed through `formatJiraErrorResponse()` which extracts only `errorMessages[]` and `errors{}` — never the full response body, headers, or tokens:

```typescript
// src/platforms/jira/JiraAdapter.ts (lines 40-53)
function formatJiraErrorResponse(data: unknown): string {
  if (data == null || typeof data !== "object") return "Bad request.";
  const d = data as { errorMessages?: string[]; errors?: Record<string, string> };
  const messages: string[] = [...(d.errorMessages ?? [])];
  if (d.errors && typeof d.errors === "object") {
    for (const [field, msg] of Object.entries(d.errors)) {
      messages.push(`${field}: ${msg}`);
    }
  }
  return messages.length > 0 ? messages.join(" ") : "Bad request.";
}
```

### 3.4 Consistent Error Pattern Across All Routes

Every Jira API route follows this error cascade:

```typescript
// Pattern used in 20+ route files
} catch (error) {
  if (error instanceof JiraAuthError) {
    await clearJiraCookie();
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "No active Jira connection found for user.") {
    await clearJiraCookie();
    return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
  }
  if (error instanceof JiraClientError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error("Failed to <operation>:", error);
  return NextResponse.json({ error: "Failed to <operation>." }, { status: 500 });
}
```

**Key properties:**

- `JiraAuthError` → safe default message to client, cookie cleared
- `JiraClientError` → parsed Jira validation message only (no tokens/headers)
- Unknown errors → **generic fixed string** to client; full error logged server-side only
- Stack traces are **never** returned to the client

### 3.5 Token Refresh Failure — No Credential Leakage

**File:** [`src/services/jiraService.ts`](../../src/services/jiraService.ts) (lines 216–259)

On refresh failure with 401/403, the connection is deactivated and a generic `JiraAuthError()` is thrown — the underlying HTTP error from Atlassian is never forwarded:

```typescript
if (isAuthError) {
  await supabase
    .from("jira_connections")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", connection.connectionId);
  throw new JiraAuthError(); // safe default message
}
```

### 3.6 Decryption Failure — No Key/Token Leakage

**File:** [`src/services/jiraService.ts`](../../src/services/jiraService.ts) (lines 73–88)

If stored encrypted tokens cannot be decrypted (key rotation, corruption), the connection is deactivated and a generic message is thrown:

```typescript
} catch {
  await supabase.from("jira_connections")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", data.id);
  throw new Error("No active Jira connection found for user.");
}
```

### 3.7 OAuth Callback — Generic Client Error

**File:** [`src/app/api/auth/jira/callback/route.ts`](../../src/app/api/auth/jira/callback/route.ts) (lines 73–76)

```typescript
} catch (err) {
  console.error("OAuth callback error:", err);
  return NextResponse.json({ error: "Failed Jira OAuth flow" }, { status: 500 });
}
```

The client receives `"Failed Jira OAuth flow"` — no tokens, codes, or redirect URIs are exposed.

### 3.8 Client-Side Error Display

Client hooks extract only the `error` string field from API responses:

```typescript
// src/hooks/useCreateJiraTask.ts (lines 17-27)
if (axios.isAxiosError(err) && err.response?.data?.error) {
  throw new Error(err.response.data.error); // only the safe "error" field
}
```

---

## 4. Security-Relevant Business Logic

### 4.1 Token Encryption at Rest

**File:** [`src/utils/encryption.ts`](../../src/utils/encryption.ts) — AES-256-GCM with random IV per operation.

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| Algorithm      | AES-256-GCM (authenticated encryption) |
| Key size       | 256 bits                               |
| IV length      | 96 bits (random per encrypt)           |
| Auth tag       | 128 bits                               |
| Key derivation | SHA-256 of `JIRA_CLIENT_SECRET`        |

Plaintext tokens **never** reach the database. See [`docs/compliance/encryption-at-rest.md`](encryption-at-rest.md) for full evidence.

### 4.2 Session Security

**File:** [`src/app/api/auth/jira/callback/route.ts`](../../src/app/api/auth/jira/callback/route.ts)

| Control          | Value                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Token generation | `crypto.randomBytes(32).toString("hex")` — 256 bits                                                 |
| Cookie flags     | `httpOnly: true`, `secure: true`, `sameSite: "none"`, `path: "/"`                                   |
| Expiry           | 30 days, validated server-side on every request                                                     |
| Session cleanup  | Old sessions deleted on new login (`createJiraSession` deletes existing for same `jira_account_id`) |

### 4.3 OAuth Token Refresh with Auto-Retry

**File:** [`src/platforms/jira/JiraAdapter.ts`](../../src/platforms/jira/JiraAdapter.ts) (lines 82–126)

The axios interceptor automatically refreshes expired tokens on 401, with a `_retry` flag to prevent infinite loops. Failed refresh deactivates the connection (see 3.5).

### 4.4 Jira Permission Checks

The app delegates CRUD authorization to Jira's `/mypermissions` API:

**File:** [`src/platforms/jira/JiraAdapter.ts`](../../src/platforms/jira/JiraAdapter.ts) (lines 815–848)

**Permission types:** `CREATE_ISSUES`, `EDIT_ISSUES`, `DELETE_ISSUES`, `ASSIGN_ISSUES`, `TRANSITION_ISSUES` — defined in [`src/types/jira.ts`](../../src/types/jira.ts).

**UI enforcement:** [`src/hooks/useIssuePermission.ts`](../../src/hooks/useIssuePermission.ts) queries the permissions API and conditionally renders edit/delete/transition controls.

### 4.5 Webhook Handler — Defensive Parsing

**File:** [`src/app/api/webhooks/jira/route.ts`](../../src/app/api/webhooks/jira/route.ts) (lines 11–70)

- `typeof` checks on every nested field (`webhookEvent`, `issue.key`, `project.key`)
- Silently drops malformed events (returns `{ ok: true }` to prevent Jira retry storms)
- Only stores sanitized `issue_key`, `project_key`, `event_type` — no raw webhook payload persisted

### 4.6 Executable File Blocking

See [1.4 File Upload Validation](#14-file-upload-validation) — explicit blocklist of dangerous extensions (`exe`, `bat`, `cmd`, `sh`, `ps1`, `vbs`, `js`, `jar`, `msi`, `dll`, `scr`).

---

## 5. Secure Dev Environment Controls (RBAC / Least Privilege)

### 5.1 Supabase Key Separation (Least Privilege)

**File:** [`src/lib/supabaseClient.ts`](../../src/lib/supabaseClient.ts)

| Context               | Key Used                        | Privileges                                                             |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| Browser (client-side) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Limited by RLS policies — can only `SELECT` from `jira_webhook_events` |
| Server (API routes)   | `SUPABASE_SERVICE_ROLE_KEY`     | Full access — only used in server-side code, never exposed to browser  |

The server client comment explicitly states: _"This must NEVER be used in the browser – only in API routes or server components."_

### 5.2 OAuth Scope Minimization

Documented in [`docs/compliance/dsar-workflow.md`](dsar-workflow.md):

| Scope                 | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `read:jira-user`      | Read user profile for `accountId`           |
| `read:jira-work`      | Read issues, projects, statuses             |
| `write:jira-work`     | Create/update issues, comments, attachments |
| `manage:jira-webhook` | Register webhooks for real-time sync        |
| `offline_access`      | Refresh token support                       |

No admin-level Jira scopes are requested.

### 5.3 Environment Variable Security

**File:** [`.env.example`](../../.env.example)

- All secrets (`SUPABASE_SERVICE_ROLE_KEY`, `JIRA_CLIENT_SECRET`, `OPENAI_API_KEY`) are environment-only
- `.env.local` is gitignored (present in workspace but not committed)
- No secrets in source code — verified by search for hardcoded tokens/keys

### 5.4 CI Pipeline Quality Gates

**File:** [`.github/workflows/testing-pipeline.yaml`](../../.github/workflows/testing-pipeline.yaml)

| Gate       | Tool                              |
| ---------- | --------------------------------- |
| Lint       | `npm run lint` (ESLint)           |
| Format     | `npm run format:check` (Prettier) |
| Unit tests | Vitest                            |
| Coverage   | `npm run test:coverage`           |
| Build      | Next.js production build          |
| E2E        | Playwright (Chromium)             |

### 5.5 Git Hooks (Pre-commit Controls)

**Files:** `.husky/pre-commit`, `.husky/commit-msg`, `commitlint.config.mjs`

- Pre-commit hooks enforced via Husky
- Commit message format enforced via commitlint

### 5.6 Jira Permission Delegation (No Custom RBAC)

The application does **not** implement its own RBAC system. Instead, it delegates all authorization decisions to Jira's built-in permission model via the `/mypermissions` API. This means:

- Users can only perform actions their Jira project role allows
- Permission changes in Jira are immediately reflected
- No custom role/permission state to maintain or drift

### 5.7 Compliance Documentation

| Document           | Path                                                             | Coverage                                                               |
| ------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Privacy Policy     | [`docs/compliance/privacy-policy.md`](privacy-policy.md)         | Data collected, subprocessors, access controls, retention, user rights |
| DPA                | [`docs/compliance/dpa.md`](dpa.md)                               | Controller/processor roles, TOMs, encryption, incident response        |
| DSAR Workflow      | [`docs/compliance/dsar-workflow.md`](dsar-workflow.md)           | Access/erasure requests, OAuth scopes, SQL evidence                    |
| Data Inventory     | [`docs/compliance/data-inventory.md`](data-inventory.md)         | Table inventory, RLS, data flows, Article 30 mapping                   |
| Encryption at Rest | [`docs/compliance/encryption-at-rest.md`](encryption-at-rest.md) | AES-256-GCM, session security, Supabase infra encryption               |

---

## 6. Pen Testing / DAST & Remediation Tracking

### 6.1 Current State

| Item                 | Status                                                            |
| -------------------- | ----------------------------------------------------------------- |
| SAST in CI           | **Not configured** — no CodeQL, Semgrep, or SonarQube in pipeline |
| DAST scanning        | **Not configured** — no OWASP ZAP, Burp Suite, or equivalent      |
| Dependency scanning  | **Not configured** — no `npm audit` in CI, no Snyk/Dependabot     |
| Pen test reports     | **Not present** in repository                                     |
| Remediation tracking | **Not present** — no security issue tracking system evident       |

### 6.2 Existing Testing Coverage (Functional, Not Security-Specific)

| Test Type  | Tool       | Files                                                              |
| ---------- | ---------- | ------------------------------------------------------------------ |
| Unit tests | Vitest     | `src/test/__tests__/jira/*.spec.ts`, `src/lib/__tests__/*.spec.ts` |
| E2E tests  | Playwright | `e2e/*.e2e.ts`, `e2e/jira/*.e2e.ts`                                |

Security-adjacent test coverage:

- `src/test/__tests__/jira/jira-issues-post.spec.ts` — validates dueDate format enforcement
- `src/lib/__tests__/jqlBuilder.spec.ts` — verifies JQL escaping behavior
- `src/lib/__tests__/workbreakdown-normalize.spec.ts` — validates AI output normalization
- `src/test/__tests__/jira/auth-jira-refresh.spec.ts` — tests token refresh flow
- `src/test/__tests__/jira/auth-jira-status.spec.ts` — tests auth status checks
