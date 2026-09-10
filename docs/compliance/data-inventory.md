# Data Inventory & Retention Schedule

> **Last updated:** 2026-07-08
> **Schema source:** [`db/schema.sql`](../../db/schema.sql)

---

## 1. Database Tables

All tables reside in the `public` schema of an Azure Database for PostgreSQL instance.

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

**RLS:** Not used. Access is via Azure PostgreSQL application logins; webhook events are read by `/api/jira/sync-signal`.

**Write path:** [`src/app/api/webhooks/jira/route.ts`](../../src/app/api/webhooks/jira/route.ts) (lines 48–53)

### 1.5 `wrike_connections`

Stores one row per user representing their Wrike OAuth connection.

| Column                    | Type            | Sensitivity | Description                                                                   |
| ------------------------- | --------------- | ----------- | ----------------------------------------------------------------------------- |
| `id`                      | `uuid` (PK)     | Low         | Internal identifier                                                           |
| `user_id`                 | `text` (unique) | Medium      | Wrike contact ID from `/api/v4/contacts?me=true`                              |
| `wrike_site`              | `text`          | Low         | Data-centre host from OAuth token response (e.g. `https://app-us2.wrike.com`) |
| `wrike_project`           | `text`          | Low         | Selected default Wrike folder key                                             |
| `wrike_account_id`        | `text`          | Medium      | Wrike account identifier (when populated)                                     |
| `access_token_encrypted`  | `text`          | **High**    | AES-256-GCM encrypted Wrike OAuth access token                                |
| `refresh_token_encrypted` | `text`          | **High**    | AES-256-GCM encrypted Wrike OAuth refresh token (nullable)                    |
| `expiry`                  | `timestamptz`   | Low         | Token expiry timestamp                                                        |
| `status`                  | `text`          | Low         | Connection status (`active` / `inactive`)                                     |
| `created_at`              | `timestamptz`   | Low         | Row creation time                                                             |
| `updated_at`              | `timestamptz`   | Low         | Last update time                                                              |

**Encryption:** `access_token_encrypted` and `refresh_token_encrypted` are encrypted at the application layer before database write. See [`libs/shared/src/lib/encryption.ts`](../../libs/shared/src/lib/encryption.ts) and the [Encryption at Rest](./encryption-at-rest.md) document.

**Write path:** [`libs/token-storage/src/PostgresTokenStore.ts`](../../libs/token-storage/src/PostgresTokenStore.ts) → `saveConnection()`; OAuth callback [`apps/wrike/src/app/api/auth/wrike/callback/route.ts`](../../apps/wrike/src/app/api/auth/wrike/callback/route.ts)
**Read path:** `PostgresTokenStore.getConnection()` via [`apps/wrike/src/services/wrikeService.ts`](../../apps/wrike/src/services/wrikeService.ts) → `getWrikeApiContext()`

### 1.6 `wrike_sessions`

Maps opaque browser session tokens to Wrike contact identifiers.

| Column             | Type            | Sensitivity | Description                                          |
| ------------------ | --------------- | ----------- | ---------------------------------------------------- |
| `id`               | `uuid` (PK)     | Low         | Internal identifier                                  |
| `session_token`    | `text` (unique) | **High**    | Cryptographically random opaque token (32 bytes hex) |
| `wrike_account_id` | `text`          | Medium      | Wrike contact ID this session belongs to             |
| `created_at`       | `timestamp`     | Low         | Session creation time                                |
| `expires_at`       | `timestamp`     | Low         | Session expiry (7 days from creation)                |

**Write path:** `PostgresTokenStore.createSession()` from [`apps/wrike/src/app/api/auth/wrike/callback/route.ts`](../../apps/wrike/src/app/api/auth/wrike/callback/route.ts)
**Read path:** [`apps/wrike/src/helpers/wrikeUserId.ts`](../../apps/wrike/src/helpers/wrikeUserId.ts) → `getWrikeUserIdFromSession()`

### 1.7 `wrike_user_setup`

Stores Wrike setup wizard state (default folder selection and completion gate).

| Column                     | Type            | Sensitivity | Description                                          |
| -------------------------- | --------------- | ----------- | ---------------------------------------------------- |
| `id`                       | `uuid` (PK)     | Low         | Internal identifier                                  |
| `user_id`                  | `text` (unique) | Medium      | Wrike contact ID                                     |
| `wrike_connection_id`      | `uuid` (FK)     | Low         | References `wrike_connections(id)`, cascading delete |
| `wrike_site_id`            | `text`          | Low         | Wrike data-centre host / site identifier             |
| `wrike_site_url`           | `text`          | Low         | Wrike site URL                                       |
| `wrike_site_name`          | `text`          | Low         | Display name (optional)                              |
| `default_project_id`       | `text`          | Low         | Default Wrike folder ID                              |
| `default_project_key`      | `text`          | Low         | Default Wrike folder key                             |
| `default_project_name`     | `text`          | Low         | Default folder display name (optional)               |
| `scope_selections`         | `jsonb`         | Low         | Setup scope level → folder selection map             |
| `task_list_scope_level_id` | `text`          | Low         | Leaf scope level gating the task list (`folder`)     |
| `setup_completed_at`       | `timestamptz`   | Low         | When setup wizard was completed (null until done)    |
| `created_at`               | `timestamptz`   | Low         | Row creation time                                    |
| `updated_at`               | `timestamptz`   | Low         | Last update time                                     |

**Write path:** [`apps/wrike/src/services/wrikeSetupService.ts`](../../apps/wrike/src/services/wrikeSetupService.ts) → `upsertUserSetup()`, `completeUserSetup()`
**Read path:** `wrikeSetupService.getUserSetup()`

### 1.8 `wrike_site_project_mappings`

Maps Sitecore websites to Wrike folders for context-aware task management.

| Column                | Type          | Sensitivity | Description                                          |
| --------------------- | ------------- | ----------- | ---------------------------------------------------- |
| `id`                  | `uuid` (PK)   | Low         | Internal identifier                                  |
| `user_id`             | `text`        | Medium      | Wrike contact ID                                     |
| `wrike_connection_id` | `uuid` (FK)   | Low         | References `wrike_connections(id)`, cascading delete |
| `sai_site_id`         | `text`        | Low         | Sitecore website identifier                          |
| `sai_site_name`       | `text`        | Low         | Sitecore website display name (optional)             |
| `wrike_site_id`       | `text`        | Low         | Wrike site identifier                                |
| `wrike_site_url`      | `text`        | Low         | Wrike site URL                                       |
| `wrike_site_name`     | `text`        | Low         | Wrike site display name (optional)                   |
| `wrike_project_id`    | `text`        | Low         | Wrike folder ID for this Sitecore site               |
| `wrike_project_key`   | `text`        | Low         | Wrike folder key                                     |
| `wrike_project_name`  | `text`        | Low         | Wrike folder display name (optional)                 |
| `created_at`          | `timestamptz` | Low         | Row creation time                                    |
| `updated_at`          | `timestamptz` | Low         | Last update time                                     |

**Write path:** [`apps/wrike/src/services/wrikeSetupService.ts`](../../apps/wrike/src/services/wrikeSetupService.ts) → `upsertUserSetupMappings()`
**Read path:** `wrikeSetupService.getUserSetupMappings()`

---

## 2. Data Classification Summary

| Classification | Data                                                  | Location                                                                                                                          |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **High**       | Jira OAuth access/refresh tokens                      | `jira_connections` (encrypted at rest)                                                                                            |
| **High**       | Wrike OAuth access/refresh tokens                     | `wrike_connections` (encrypted at rest)                                                                                           |
| **High**       | Session tokens                                        | `jira_sessions.session_token`, `wrike_sessions.session_token`, browser cookies                                                    |
| **Medium**     | Jira account identifiers                              | `jira_connections.user_id`, `jira_sessions.jira_account_id`, `sync_logs.user_id`                                                  |
| **Medium**     | Wrike contact identifiers                             | `wrike_connections.user_id`, `wrike_sessions.wrike_account_id`, `wrike_user_setup.user_id`, `wrike_site_project_mappings.user_id` |
| **Low**        | Project metadata, issue keys, event types, timestamps | All tables                                                                                                                        |

---

## 3. Data Flow Diagram (AI integartion is currently disabled)

```
┌──────────────────┐     HTTPS (TLS 1.2+)        ┌───────────────────────┐
│   User Browser   │ ◄─────────────────────────► │  Next.js API Routes   │
│                  │   Cookie: jira_session_token│  (Vercel / Node.js)   │
│                  │         or wrike_session    │                       │
└──────────────────┘                             └───────────┬───────────┘
                                                             │
                          ┌──────────────────────────────────┼──────────────────────────┐
                          │                                  │                          │
                          ▼                                  ▼                          ▼
              ┌───────────────────┐              ┌───────────────────┐      ┌───────────────────┐
              │   Azure PostgreSQL│              │  Platform APIs    │      │   OpenAI API      │
              │   (PostgreSQL)    │              │                   │      │   (gpt-4o)        │
              │                   │              │ • Jira Cloud      │      │                   │
              │ • jira_connections│              │   OAuth + REST    │      │ • requirementText │
              │   (tokens enc.)   │              │ • Wrike           │      │   (user-typed)    │
              │ • wrike_connections              │   OAuth + REST v4 │      │ • System prompt   │
              │   (tokens enc.)   │              │   (region host)   │      │   (fixed template)│
              │ • jira_sessions   │              │ • Jira webhooks   │      │                   │
              │ • wrike_sessions  │              │                   │      │                   │
              │ • sync_logs       │              │                   │      │                   │
              │ • webhook_events  │              │                   │      │                   │
              │ • wrike_user_setup│              │                   │      │                   │
              │ • wrike_site_     │              │                   │      │                   │
              │   project_mappings│              │                   │      │                   │
              └───────────────────┘              └───────────────────┘      └───────────────────┘
```

### Flow descriptions

1. **Browser → API:** User authenticates via platform OAuth (Jira or Wrike). Browser receives an opaque session cookie (`jira_session_token` or `wrike_session`; httpOnly, secure, sameSite=none). No platform OAuth tokens are ever exposed to the browser.
2. **API → Azure PostgreSQL:** Server-side code reads/writes using `DATABASE_URL`. Tokens are encrypted before write (AES-256-GCM) and decrypted after read.
3. **API → Atlassian (Jira):** Server-side code calls Jira REST APIs using the decrypted Bearer token. Token refresh is handled automatically.
4. **API → Wrike:** Server-side code calls Wrike REST API v4 on the user's data-centre host (from the OAuth token response). Token refresh uses Wrike's rotating refresh-token flow.
5. **API → OpenAI:** Only when `OPENAI_API_KEY` is set and the AI feature flag is enabled. Only the user-typed `requirementText` and fixed prompt templates are sent. No tokens, user IDs, or platform data are included.
6. **Jira → API (Webhooks):** Jira sends webhook events to `/api/webhooks/jira`. Only issue key, project key, and event type are persisted.

---

## 4. Retention Policy

| Data                          | Retention                                               | Deletion Trigger                                                                                     |
| ----------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `jira_connections`            | Until user disconnects or connection becomes `inactive` | User-initiated disconnect (`disconnectUserJira`); token decryption failure auto-inactivates          |
| `wrike_connections`           | Until user disconnects or connection becomes `inactive` | User-initiated disconnect; token decryption failure auto-inactivates via `PostgresTokenStore`        |
| `jira_sessions`               | 30 days from creation (`expires_at`)                    | Expired sessions should be purged periodically; replaced on re-authentication; deleted on disconnect |
| `wrike_sessions`              | 7 days from creation (`expires_at`)                     | Expired sessions should be purged periodically; replaced on re-authentication; deleted on disconnect |
| `wrike_user_setup`            | Until user disconnects with `wipe=true` or hard-delete  | `disconnectAndWipeUserWrike()`; cascade when parent `wrike_connections` row is deleted               |
| `wrike_site_project_mappings` | Until user disconnects with `wipe=true` or hard-delete  | `disconnectAndWipeUserWrike()`; cascade when parent `wrike_connections` row is deleted               |
| `sync_logs`                   | Indefinite (audit trail)                                | Cascading delete when parent `jira_connections` row is deleted                                       |
| `jira_webhook_events`         | Indefinite (event log)                                  | **Recommended:** Implement periodic cleanup (e.g. delete events older than 90 days)                  |

## 5. Personal Data Inventory (GDPR Article 30)

| Personal Data Element       | Source                 | Legal Basis                                | Storage Location                                                                                                                  | Shared With                      |
| --------------------------- | ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Jira `accountId`            | Atlassian OAuth        | Legitimate interest / contract performance | `jira_connections.user_id`, `jira_sessions.jira_account_id`, `sync_logs.user_id`                                                  | Not shared externally            |
| Jira OAuth tokens           | Atlassian OAuth        | Contract performance                       | `jira_connections` (encrypted)                                                                                                    | Atlassian (for API calls)        |
| Wrike contact ID            | Wrike OAuth            | Legitimate interest / contract performance | `wrike_connections.user_id`, `wrike_sessions.wrike_account_id`, `wrike_user_setup.user_id`, `wrike_site_project_mappings.user_id` | Not shared externally            |
| Wrike OAuth tokens          | Wrike OAuth            | Contract performance                       | `wrike_connections` (encrypted)                                                                                                   | Wrike (for API calls)            |
| Wrike folder/site metadata  | Wrike API + user setup | Contract performance                       | `wrike_connections`, `wrike_user_setup`, `wrike_site_project_mappings`                                                            | Not shared externally            |
| User-typed requirement text | User input             | Consent (opt-in AI feature)                | In-memory only (not persisted in DB)                                                                                              | OpenAI (when AI feature enabled) |
| Jira issue/project keys     | Jira webhooks          | Legitimate interest                        | `jira_webhook_events`                                                                                                             | Not shared externally            |
| Session token               | Application-generated  | Contract performance                       | `jira_sessions`, `wrike_sessions`, browser cookies                                                                                | Not shared externally            |
