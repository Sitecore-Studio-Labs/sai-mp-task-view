# Data Subject Access Request (DSAR) Workflow

> **Last updated:** 2026-04-02

This document defines the technical and operational procedures for handling data subject rights under GDPR (and equivalent regulations). It covers the app's actual user interaction model, self-service controls, and admin-level erasure procedures.

---

## 1. How Users Interact with the App

The App is a **Sitecore Marketplace extension** that integrates with Jira via OAuth. It has **no user registration, no login system, and no email collection**. The entire user lifecycle is:

1. **Connect** — User clicks "Connect to Jira" and is redirected to Atlassian's OAuth consent screen (`prompt=consent`), which displays the permissions being requested (`read:jira-user`, `read:jira-work`, `write:jira-work`, `manage:jira-webhook`, `offline_access`).
2. **Use** — After granting consent, the user interacts with Jira through the App. The only identifier stored is the Jira `accountId` (a pseudonymous ID from Atlassian).
3. **Disconnect** — User clicks "Disconnect" in the App UI, which removes their session and deactivates their connection.

**Source:** [`src/app/api/auth/jira/connect/route.ts`](../../src/app/api/auth/jira/connect/route.ts) (OAuth initiation), [`src/app/api/auth/jira/callback/route.ts`](../../src/app/api/auth/jira/callback/route.ts) (callback + session creation), [`src/app/api/auth/jira/disconnect/route.ts`](../../src/app/api/auth/jira/disconnect/route.ts) (disconnect)

### Consequence for DSARs

Because the App does not collect contact information (no email, no name, no account), there is **no direct channel** for users to submit data access/erasure requests through the App itself. Data subject rights are exercised through:

1. **Self-service controls** built into the App (disconnect)
2. **Atlassian's app lifecycle events** (app uninstall)
3. **Sitecore Marketplace** support channels (if the marketplace provides a DSAR mechanism)
4. **Organization-level requests** routed through the Sitecore Marketplace or Atlassian admin

---

## 2. Data Lookup Keys

All data is keyed by the Jira `accountId`, which is obtained from Atlassian during the OAuth callback.

| Table                 | Lookup Column   | Column Name                                             |
| --------------------- | --------------- | ------------------------------------------------------- |
| `jira_connections`    | Jira account ID | `user_id`                                               |
| `jira_sessions`       | Jira account ID | `jira_account_id`                                       |
| `sync_logs`           | Jira account ID | `user_id`                                               |
| `jira_webhook_events` | N/A             | Not linked to a user (contains only issue/project keys) |

---

## 3. Self-Service Controls (User-Initiated)

### 3.1 Disconnect (Primary Erasure Mechanism)

The user can disconnect their Jira integration at any time through the App UI. This triggers `disconnectUserJira()` in [`src/services/jiraService.ts`](../../src/services/jiraService.ts) (lines 42–57):

1. Sets `jira_connections.status` to `inactive` (encrypted tokens become inaccessible for use)
2. Deletes all `jira_sessions` rows for the user's `jira_account_id`
3. Clears the `jira_session_token` cookie from the browser

**What disconnect does NOT do:** It does not hard-delete the `jira_connections` row or `sync_logs`. The inactive connection row retains encrypted tokens until hard-deleted (see Section 5).

### 3.2 Consent Withdrawal

- **Jira access:** The user can revoke the App's access to their Jira account at any time via [Atlassian Connected Apps settings](https://id.atlassian.com/manage-profile/apps). This invalidates the stored OAuth tokens, and the App will automatically detect the failure and deactivate the connection on the next API call.
- **AI feature:** The AI feature requires the user to actively type text and click generate. Not using the AI panel is sufficient to withdraw consent. No AI data is persisted.

---

## 4. Right of Access (Data Export)

If a data export is requested (e.g. through the Sitecore Marketplace support channel or Atlassian admin), use the following queries. Replace `$ACCOUNT_ID` with the subject's Jira `accountId`.

```sql
-- 1. Connection data (token values redacted for security)
SELECT
  id,
  user_id,
  jira_site,
  jira_project,
  '[ENCRYPTED - AES-256-GCM]' AS access_token_encrypted,
  '[ENCRYPTED - AES-256-GCM]' AS refresh_token_encrypted,
  expiry,
  status,
  created_at,
  updated_at
FROM public.jira_connections
WHERE user_id = '$ACCOUNT_ID';

-- 2. Session data (token redacted)
SELECT
  id,
  '[REDACTED]' AS session_token,
  jira_account_id,
  created_at,
  expires_at
FROM public.jira_sessions
WHERE jira_account_id = '$ACCOUNT_ID';

-- 3. Audit logs
SELECT
  id,
  user_id,
  jira_connection_id,
  action,
  details,
  created_at
FROM public.sync_logs
WHERE user_id = '$ACCOUNT_ID';
```

### Notes

- **Encrypted tokens** are reported as `[ENCRYPTED]` — exposing plaintext tokens would be a security risk.
- **Session tokens** are redacted for the same reason.
- **Webhook events** (`jira_webhook_events`) contain issue/project keys but are not linked to individual users.
- Export format: JSON or CSV as appropriate.

---

## 5. Right to Erasure (Full Deletion)

### 5.1 Triggers for Full Erasure

| Trigger                         | Who Initiates                        | Mechanism                                                   |
| ------------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| User disconnects                | User (self-service)                  | Soft-delete: connection set to `inactive`, sessions deleted |
| User revokes OAuth in Atlassian | User (via Atlassian)                 | Tokens invalidated; connection auto-deactivated on next use |
| App uninstalled from Jira site  | Jira admin                           | Should trigger full erasure (see lifecycle events below)    |
| Formal erasure request          | User (via Marketplace/admin channel) | Admin runs SQL deletion (see below)                         |

### 5.2 Full Erasure SQL (Admin-Initiated)

For a complete data erasure, execute the following. Replace `$ACCOUNT_ID` with the subject's Jira `accountId`.

```sql
-- Step 1: Delete sync logs
DELETE FROM public.sync_logs
WHERE user_id = '$ACCOUNT_ID';

-- Step 2: Delete connection (also cascades to sync_logs via FK ON DELETE CASCADE)
DELETE FROM public.jira_connections
WHERE user_id = '$ACCOUNT_ID';

-- Step 3: Delete sessions
DELETE FROM public.jira_sessions
WHERE jira_account_id = '$ACCOUNT_ID';
```

### 5.3 Verification

```sql
SELECT COUNT(*) FROM public.jira_connections WHERE user_id = '$ACCOUNT_ID';
-- Expected: 0

SELECT COUNT(*) FROM public.jira_sessions WHERE jira_account_id = '$ACCOUNT_ID';
-- Expected: 0

SELECT COUNT(*) FROM public.sync_logs WHERE user_id = '$ACCOUNT_ID';
-- Expected: 0
```

### 5.4 Third-Party Data

After local erasure, consider data held by sub-processors:

| Third Party          | Action                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase**         | Data is deleted from live DB; backups are overwritten per Supabase's retention policy (typically 7 days on Pro plan)                                                                          |
| **OpenAI**           | If the AI feature was used, OpenAI retains API inputs for up to 30 days for abuse monitoring, then deletes. Request earlier deletion via [OpenAI support](https://help.openai.com/) if needed |
| **Atlassian**        | User's Atlassian account is managed by Atlassian; direct the subject to [Atlassian Privacy Controls](https://www.atlassian.com/trust/privacy)                                                 |
| **Hosting provider** | Server logs may contain request metadata; check the hosting provider's log retention policy                                                                                                   |

---

## 6. Right to Rectification

Most data is system-generated or sourced from Atlassian. There is limited scope for rectification:

| Data                        | Rectifiable?     | Method                                                                       |
| --------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `user_id` (accountId)       | No               | Sourced from Atlassian; changes must be made in the user's Atlassian account |
| `jira_site`, `jira_project` | Yes (indirectly) | User can disconnect and reconnect, selecting a different site/project        |
| `sync_logs.details`         | No               | Audit log; immutable by design                                               |
| `jira_webhook_events`       | No               | Event log; immutable by design                                               |

For Atlassian-sourced data, direct the subject to [Atlassian Account Settings](https://id.atlassian.com/manage-profile).

---

## 7. Atlassian App Lifecycle Events

When a Jira admin uninstalls the App from their site, Atlassian can send lifecycle events. These should trigger automatic cleanup of all data for users on that site.

### Recommended Implementation

- [ ] Handle the Atlassian `app_uninstalled` lifecycle callback
- [ ] On uninstall, query all `jira_connections` where `jira_site` matches the uninstalled site's `cloudId`
- [ ] Run full erasure (Section 5.2) for each affected `user_id`
- [ ] Log the cleanup action for compliance records
