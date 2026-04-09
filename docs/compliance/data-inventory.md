# Data Inventory & Retention Schedule

> **Last updated:** 2026-04-02
> **Schema source:** [`supabase/schema.sql`](../../supabase/schema.sql)

---

## 1. Database Tables

All tables reside in the `public` schema of a Supabase-hosted PostgreSQL instance.

### 1.1 `jira_connections`

Stores one row per user representing their Jira OAuth connection.

| Column                    | Type            | Sensitivity | Description                                               |
| ------------------------- | --------------- | ----------- | --------------------------------------------------------- |
| `id`                      | `uuid` (PK)     | Low         | Internal identifier                                       |
| `user_id`                 | `text` (unique) | Medium      | Jira `accountId` — pseudonymous identifier from Atlassian |
| `jira_site`               | `text`          | Low         | Atlassian Cloud `cloudId` (UUID)                          |
| `jira_project`            | `text`          | Low         | Selected Jira project key                                 |
| `access_token_encrypted`  | `text`          | **High**    | AES-256-GCM encrypted Jira OAuth access token             |
| `refresh_token_encrypted` | `text`          | **High**    | AES-256-GCM encrypted Jira OAuth refresh token            |
| `expiry`                  | `timestamptz`   | Low         | Token expiry timestamp                                    |
| `status`                  | `text`          | Low         | Connection status (`active` / `inactive`)                 |
| `created_at`              | `timestamptz`   | Low         | Row creation time                                         |
| `updated_at`              | `timestamptz`   | Low         | Last update time                                          |

**Encryption:** `access_token_encrypted` and `refresh_token_encrypted` are encrypted at the application layer before database write. See [`src/utils/encryption.ts`](../../src/utils/encryption.ts) and the [Encryption at Rest](./encryption-at-rest.md) document.

**Write path:** [`src/services/jiraService.ts` → `saveUserJiraConnection()`](../../src/services/jiraService.ts) (lines 105–147)
**Read path:** [`src/services/jiraService.ts` → `getUserJiraConnection()`](../../src/services/jiraService.ts) (lines 59–103)

### 1.2 `jira_sessions`

Maps opaque browser session tokens to Jira account identifiers.

| Column            | Type            | Sensitivity | Description                                          |
| ----------------- | --------------- | ----------- | ---------------------------------------------------- |
| `id`              | `uuid` (PK)     | Low         | Internal identifier                                  |
| `session_token`   | `text` (unique) | **High**    | Cryptographically random opaque token (32 bytes hex) |
| `jira_account_id` | `text`          | Medium      | Jira `accountId` this session belongs to             |
| `created_at`      | `timestamp`     | Low         | Session creation time                                |
| `expires_at`      | `timestamp`     | Low         | Session expiry (30 days from creation)               |

**Write path:** [`src/services/jiraService.ts` → `createJiraSession()`](../../src/services/jiraService.ts) (lines 166–185)
**Read path:** [`src/helpers/jiraUserId.ts` → `getJiraUserIdFromSession()`](../../src/helpers/jiraUserId.ts) (lines 5–29)

### 1.3 `sync_logs`

Audit trail of connection lifecycle and token refresh events.

| Column               | Type          | Sensitivity | Description                                          |
| -------------------- | ------------- | ----------- | ---------------------------------------------------- |
| `id`                 | `uuid` (PK)   | Low         | Internal identifier                                  |
| `user_id`            | `text`        | Medium      | Jira `accountId`                                     |
| `jira_connection_id` | `uuid` (FK)   | Low         | References `jira_connections(id)`, cascading delete  |
| `action`             | `text`        | Low         | Action type: `connection_updated`, `token_refreshed` |
| `details`            | `jsonb`       | Low         | Contextual metadata (e.g. `{ "jiraSite": "..." }`)   |
| `created_at`         | `timestamptz` | Low         | Event timestamp                                      |

### 1.4 `jira_webhook_events`

Stores inbound Jira webhook payloads for real-time UI synchronization.

| Column        | Type          | Sensitivity | Description                                       |
| ------------- | ------------- | ----------- | ------------------------------------------------- |
| `id`          | `uuid` (PK)   | Low         | Internal identifier                               |
| `issue_key`   | `text`        | Low         | Jira issue key (e.g. `PROJ-123`)                  |
| `project_key` | `text`        | Low         | Jira project key                                  |
| `event_type`  | `text`        | Low         | `issue_created`, `issue_updated`, `issue_deleted` |
| `occurred_at` | `timestamptz` | Low         | When the event occurred                           |
| `created_at`  | `timestamptz` | Low         | Row creation time                                 |

**RLS:** This table has Row Level Security enabled. Policy `"Allow read for sync"` permits `SELECT` for Supabase Realtime subscriptions.

**Write path:** [`src/app/api/webhooks/jira/route.ts`](../../src/app/api/webhooks/jira/route.ts) (lines 48–53)

---

## 2. Data Classification Summary

| Classification | Data                                                  | Location                                                                         |
| -------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| **High**       | Jira OAuth access/refresh tokens                      | `jira_connections` (encrypted at rest)                                           |
| **High**       | Session tokens                                        | `jira_sessions.session_token`, browser cookie                                    |
| **Medium**     | Jira account identifiers                              | `jira_connections.user_id`, `jira_sessions.jira_account_id`, `sync_logs.user_id` |
| **Low**        | Project metadata, issue keys, event types, timestamps | All tables                                                                       |

---

## 3. Data Flow Diagram (AI integartion is currently disabled)

```
┌──────────────────┐     HTTPS (TLS 1.2+)        ┌───────────────────────┐
│   User Browser   │ ◄─────────────────────────► │  Next.js API Routes   │
│                  │   Cookie: jira_session_token│  (Vercel / Node.js)   │
└──────────────────┘                             └───────────┬───────────┘
                                                             │
                          ┌──────────────────────────────────┼──────────────────────────┐
                          │                                  │                          │
                          ▼                                  ▼                          ▼
              ┌───────────────────┐              ┌───────────────────┐      ┌───────────────────┐
              │   Supabase DB     │              │   Atlassian APIs  │      │   OpenAI API      │
              │   (PostgreSQL)    │              │   (Jira Cloud)    │      │   (gpt-4o)        │
              │                   │              │                   │      │                   │
              │ • jira_connections│              │ • OAuth exchange  │      │ • requirementText │
              │   (tokens enc.)   │              │ • REST API calls  │      │   (user-typed)    │
              │ • jira_sessions   │              │ • Webhook events  │      │ • System prompt   │
              │ • sync_logs       │              │                   │      │   (fixed template)│
              │ • webhook_events  │              │                   │      │                   │
              └───────────────────┘              └───────────────────┘      └───────────────────┘
```

### Flow descriptions

1. **Browser → API:** User authenticates via Jira OAuth. Browser receives an opaque `jira_session_token` cookie (httpOnly, secure, sameSite=none). No Jira tokens are ever exposed to the browser.
2. **API → Supabase:** Server-side code reads/writes using a service role key. Tokens are encrypted before write (AES-256-GCM) and decrypted after read.
3. **API → Atlassian:** Server-side code calls Jira REST APIs using the decrypted Bearer token. Token refresh is handled automatically.
4. **API → OpenAI:** Only when `OPENAI_API_KEY` is set and the AI feature flag is enabled. Only the user-typed `requirementText` and fixed prompt templates are sent. No tokens, user IDs, or Jira data are included.
5. **Jira → API (Webhooks):** Jira sends webhook events to `/api/webhooks/jira`. Only issue key, project key, and event type are persisted.

---

## 4. Retention Policy

| Data                  | Retention                                               | Deletion Trigger                                                                                     |
| --------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `jira_connections`    | Until user disconnects or connection becomes `inactive` | User-initiated disconnect (`disconnectUserJira`); token decryption failure auto-inactivates          |
| `jira_sessions`       | 30 days from creation (`expires_at`)                    | Expired sessions should be purged periodically; replaced on re-authentication; deleted on disconnect |
| `sync_logs`           | Indefinite (audit trail)                                | Cascading delete when parent `jira_connections` row is deleted                                       |
| `jira_webhook_events` | Indefinite (event log)                                  | **Recommended:** Implement periodic cleanup (e.g. delete events older than 90 days)                  |

## 5. Personal Data Inventory (GDPR Article 30)

| Personal Data Element       | Source                | Legal Basis                                | Storage Location                                                                 | Shared With                      |
| --------------------------- | --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------- |
| Jira `accountId`            | Atlassian OAuth       | Legitimate interest / contract performance | `jira_connections.user_id`, `jira_sessions.jira_account_id`, `sync_logs.user_id` | Not shared externally            |
| Jira OAuth tokens           | Atlassian OAuth       | Contract performance                       | `jira_connections` (encrypted)                                                   | Atlassian (for API calls)        |
| User-typed requirement text | User input            | Consent (opt-in AI feature)                | In-memory only (not persisted in DB)                                             | OpenAI (when AI feature enabled) |
| Jira issue/project keys     | Jira webhooks         | Legitimate interest                        | `jira_webhook_events`                                                            | Not shared externally            |
| Session token               | Application-generated | Contract performance                       | `jira_sessions`, browser cookie                                                  | Not shared externally            |
