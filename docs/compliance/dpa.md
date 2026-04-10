# Data Processing Agreement (DPA) — Reference Document

> **Last updated:** 2026-04-02

---

## 1. Overview

The Sitecore Marketplace Jira Task View application processes personal data on behalf of its users. This document outlines the data processing activities, sub-processors involved, and references to their respective DPAs.

---

## 2. Roles

| Role                | Entity                                                 | Description                                                       |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| **Data Controller** | The end user's organization                            | Determines the purposes and means of processing Jira data         |
| **Data Processor**  | Processes data on behalf of the Controller via the App |
| **Sub-processors**  | Atlassian, Supabase, OpenAI, Vercel                    | Third-party services that process data on behalf of the Processor |

---

## 3. Processing Activities

| Activity                      | Data Processed                                                | Purpose                                  | Duration                            |
| ----------------------------- | ------------------------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| **Jira OAuth authentication** | Jira `accountId`, OAuth tokens                                | Establish and maintain Jira connection   | Until disconnection                 |
| **Session management**        | Session token, Jira `accountId`                               | Authenticate browser sessions            | 30 days per session                 |
| **Jira API proxying**         | Jira issue data (titles, descriptions, comments, attachments) | Display and manage Jira tasks in the App | Transient (not stored locally)      |
| **Webhook processing**        | Issue keys, project keys, event types                         | Real-time UI synchronization             | Stored in DB (see retention policy) |
| **Audit logging**             | User ID, connection ID, action type                           | Security monitoring and debugging        | Retained with parent connection     |

---

## 4. Sub-Processor Registry

### 4.1 Atlassian (Jira Cloud)

| Property                   | Detail                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Service**                | Jira Cloud — project management platform                                                       |
| **Data processed**         | OAuth tokens (for authentication), all Jira API requests/responses                             |
| **Processing location**    | Global (Atlassian Cloud regions)                                                               |
| **DPA**                    | [Atlassian Data Processing Addendum](https://www.atlassian.com/legal/data-processing-addendum) |
| **Security documentation** | [Atlassian Trust Center](https://www.atlassian.com/trust)                                      |
| **Certifications**         | SOC 2 Type II, ISO 27001, ISO 27018                                                            |

### 4.2 Supabase

| Property                   | Detail                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| **Service**                | PostgreSQL database hosting, Realtime subscriptions                          |
| **Data processed**         | All database contents: encrypted tokens, sessions, sync logs, webhook events |
| **Processing location**    | [SUPABASE_REGION — e.g., AWS us-east-1]                                      |
| **DPA**                    | [Supabase Data Processing Agreement](https://supabase.com/legal/dpa)         |
| **Security documentation** | [Supabase Security](https://supabase.com/docs/guides/platform/security)      |
| **Encryption**             | AES-256 at rest (AWS EBS), TLS in transit                                    |
| **Certifications**         | SOC 2 Type II                                                                |

### 4.3 OpenAI (AI integartion is currently disabled)

| Property                | Detail                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Service**             | Chat Completions API (`gpt-4o` model)                                                     |
| **Data processed**      | User-typed requirement text (free-form), fixed prompt templates                           |
| **Processing location** | United States                                                                             |
| **DPA**                 | [OpenAI Data Processing Agreement](https://openai.com/policies/data-processing-agreement) |
| **Data usage**          | API inputs are NOT used for model training by default                                     |
| **Data retention**      | Up to 30 days for abuse monitoring (per OpenAI policy), then deleted                      |
| **Opt-in only**         | Feature requires `OPENAI_API_KEY` + feature flag; disabled by default                     |
| **Certifications**      | SOC 2 Type II                                                                             |

### 4.4 Hosting Provider

| Property                   | Detail                                                                   |
| -------------------------- | ------------------------------------------------------------------------ |
| **Service**                | [HOSTING_PROVIDER — Vercel]                                              |
| **Data processed**         | HTTP request/response traffic, environment variables (encrypted at rest) |
| **Processing location**    |
| **DPA**                    | [HOSTING_DPA_LINK — e.g., https://vercel.com/legal/dpa]                  |
| **Security documentation** |

---

## 5. Technical & Organizational Measures (TOMs)

The following measures are implemented to protect personal data:

### 5.1 Encryption

- **Application-layer encryption:** Jira OAuth tokens encrypted with AES-256-GCM before database storage ([details](./encryption-at-rest.md))
- **Infrastructure encryption:** Database storage encrypted at rest (AES-256 via AWS EBS)
- **Transit encryption:** All data in transit protected by TLS 1.2+
- **Backup encryption:** Database backups encrypted at rest

### 5.2 Access Controls

- Server-side only access to Supabase (service role key)
- Browser client uses limited anon key
- Row Level Security on applicable tables
- Environment variables stored in hosting platform's encrypted secrets manager

### 5.3 Session Security

- Cryptographically random 256-bit session tokens
- `httpOnly`, `secure`, `sameSite` cookie flags
- 30-day session expiry
- Session cleanup on disconnect

### 5.4 Incident Response

- Decrypt failures automatically deactivate affected connections
- Auth failures (401/403) automatically deactivate connections and clear sessions
- Audit logs track connection lifecycle events

---

## 6. Data Subject Rights Support

The App provides self-service controls for users to exercise their data rights:

- **Disconnect:** Users can disconnect at any time via the App UI, which deactivates the connection and deletes session data.
- **Consent revocation:** Users can revoke the App's Jira access via [Atlassian Connected Apps](https://id.atlassian.com/manage-profile/apps).
- **Formal requests:** Since the App does not collect contact information (no email, no name), formal DSARs should be routed through the Sitecore Marketplace support channel or the Jira site administrator.

For admin-level data export and full erasure procedures, see the [DSAR Workflow](./dsar-workflow.md).

---

## 8. Audit Rights

The Data Controller has the right to audit the Processor's compliance with this DPA, subject to reasonable notice and confidentiality obligations.
