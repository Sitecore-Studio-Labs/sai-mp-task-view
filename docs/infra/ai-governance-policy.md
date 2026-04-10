# AI Governance Policy

> **Document owner:** Engineering & Security  
> **Last updated:** 2026-04-06  
> **Applies to:** AI-assisted work breakdown feature (parse-requirements)  
> **Current status:** Feature is **disabled for MVP** (`NEXT_PUBLIC_ENABLE_AI_TASK_CREATION=false`). To be released as a post-MVP enhancement.

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Acceptable Use Rules](#2-acceptable-use-rules)
3. [Data Minimization & Retention](#3-data-minimization--retention)
4. [Monitoring, Rate Limiting & Abuse Controls](#4-monitoring-rate-limiting--abuse-controls)
5. [Human Oversight & Non-Autonomy Principle](#5-human-oversight--non-autonomy-principle)
6. [AI Provider Governance](#6-ai-provider-governance)
7. [Incident Response & Escalation](#7-incident-response--escalation)
8. [Audit Evidence](#8-audit-evidence)
9. [Review Cadence](#9-review-cadence)

---

## 1. Purpose & Scope

### 1.1 Purpose

This policy establishes governance rules, acceptable use boundaries, data handling commitments, and monitoring controls for the AI integration in the application. It ensures AI is used as a productivity tool under human supervision, not as an autonomous decision-maker.

### 1.2 Scope

| In scope                                   | Out of scope                                |
| ------------------------------------------ | ------------------------------------------- |
| `POST /api/ai/parse-requirements` endpoint | Any other AI/ML usage (none exists)         |
| OpenAI GPT-4o integration (`ai-openai.ts`) | Training or fine-tuning models              |
| Deterministic stub (`ai-stub.ts`)          | Customer data analysis                      |
| Work breakdown draft lifecycle             | Direct Jira automation without human review |

### 1.3 Current State

The AI feature is gated by `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION`, which is set to `false` for the MVP release. When disabled:

- The AI button is not rendered in the UI.
- The API endpoint still exists but is not reachable through normal user flows.
- If `OPENAI_API_KEY` is also unset, any direct API call returns a deterministic stub (no external AI call).

---

## 2. Acceptable Use Rules

### 2.1 Permitted Uses

| Use case                  | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| Work breakdown generation | Convert business requirements into structured task hierarchies     |
| Task planning assistance  | Help teams decompose epics into stories, tasks, and subtasks       |
| Template generation       | Provide starting-point task structures for common project patterns |

### 2.2 Prohibited Uses

| Prohibited use                   | Rationale                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Autonomous issue creation        | AI must never create Jira issues without explicit human review and approval                                  |
| PII processing                   | Users must not paste personal data into the requirement text field; the system does not detect or redact PII |
| Security-critical decisions      | AI output must not be used for access control, authentication, or authorization decisions                    |
| Compliance/legal text generation | AI-generated text must not be used as-is for legal, regulatory, or contractual documents                     |
| Bulk automated calls             | Programmatic mass invocation of the AI endpoint is prohibited                                                |

### 2.3 User Responsibilities

- Users understand that AI output is a **suggestion** that requires human review.
- Users must review, edit, and approve all generated work items before publishing to Jira.
- Users must not include sensitive credentials, API keys, or personal data in requirement text.

---

## 3. Data Minimization & Retention

### 3.1 Data Sent to OpenAI

When `OPENAI_API_KEY` is configured and the feature is enabled:

| Data element                   | Sent to OpenAI? | Purpose                                          |
| ------------------------------ | --------------- | ------------------------------------------------ |
| `requirementText` (user input) | Yes             | Used as the user prompt for breakdown generation |
| System prompt (static)         | Yes             | Instructs the model on output format             |
| `projectKey`                   | No              | Used only server-side for draft metadata         |
| `platform`                     | No              | Used only server-side for draft metadata         |
| User identity / session        | No              | Not included in the AI request                   |
| Jira tokens / credentials      | No              | Never included in AI requests                    |

### 3.2 Data Minimization Commitments

| Commitment                          | Implementation                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minimum necessary data**          | Only `requirementText` is sent to OpenAI; no user identity, project metadata, or credentials                                                                |
| **No training on our data**         | OpenAI API (non-ChatGPT) does not use API inputs for model training per [OpenAI API data usage policy](https://openai.com/policies/api-data-usage-policies) |
| **No persistent storage at OpenAI** | API requests are retained by OpenAI for up to 30 days for abuse monitoring per their policy, then deleted                                                   |
| **No local AI data persistence**    | Drafts are stored in-memory only; lost on server restart; no database table for AI inputs or outputs                                                        |

### 3.3 Retention Schedule

| Data                    | Storage                                     | Retention                                    | Deletion mechanism                                 |
| ----------------------- | ------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| User's requirement text | In-memory (server process)                  | Until server restart or draft overwritten    | Automatic — process termination or `Map.delete()`  |
| AI-generated draft      | In-memory `Map` in `workbreakdown-store.ts` | Until server restart or draft overwritten    | Automatic — process termination or `deleteDraft()` |
| Published Jira issues   | Jira Cloud (customer's tenant)              | Governed by customer's Jira retention policy | Customer-managed                                   |
| AI request logs         | Server `console.error` (only on failure)    | Governed by hosting platform log retention   | Platform-managed                                   |
| OpenAI-side retention   | OpenAI infrastructure                       | Up to 30 days per OpenAI policy              | OpenAI-managed                                     |

### 3.4 When AI Is Disabled (MVP Configuration)

When `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION=false` **and** `OPENAI_API_KEY` is unset:

- **Zero data sent externally.** The stub runs entirely server-side.
- **Zero third-party API calls.** No network request to OpenAI or any other AI provider.
- **Stub output** is a deterministic template derived from the input text (title extraction only).

---

## 4. Monitoring, Rate Limiting & Abuse Controls

### 4.1 Current Controls

| Control                          | Status                | Detail                                                        |
| -------------------------------- | --------------------- | ------------------------------------------------------------- |
| **Feature flag**                 | Active                | `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION=false` — AI UI is hidden |
| **API key gate**                 | Active                | No `OPENAI_API_KEY` → stub response, no external call         |
| **Server-side error logging**    | Active                | All AI endpoint failures are logged via `console.error`       |
| **OpenAI-side abuse monitoring** | Active (when enabled) | OpenAI monitors API usage per their terms of service          |

### 4.2 Controls Planned for Post-MVP Enablement

| Control                       | Description                                                                                                           | Priority |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| **Session-gated AI endpoint** | Add `getJiraUserIdFromSession()` check to `parse-requirements` route, ensuring only authenticated users can invoke AI | High     |
| **Per-user rate limiting**    | Limit AI requests per user per time window (e.g., 10 requests/hour) to prevent abuse                                  | High     |
| **Request size limit**        | Cap `requirementText` length (e.g., 10,000 characters) to prevent token abuse                                         | Medium   |
| **Usage telemetry**           | Log AI request counts, latency, and error rates for operational monitoring                                            | Medium   |
| **Cost alerting**             | Set OpenAI API spending alerts/limits to detect anomalous usage                                                       | Medium   |
| **Input sanitization**        | Warn or block requirement text that appears to contain credentials or PII patterns                                    | Low      |

### 4.3 Abuse Scenarios & Mitigations

| Scenario                      | Current mitigation                                                | Post-MVP mitigation                    |
| ----------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| Unauthenticated bulk AI calls | Feature flag off; no API key → stub only                          | Session gate + rate limiting           |
| Prompt injection              | Output is parsed through 4-stage pipeline; never executed as code | Same + input length limits             |
| Token cost abuse              | API key not deployed                                              | Per-user rate limits + spending alerts |
| Data exfiltration via prompts | Only `requirementText` sent; no app data in prompt                | Input size cap + monitoring            |

---

## 5. Human Oversight & Non-Autonomy Principle

### 5.1 Core Principle

> **AI output is treated as a suggestion, never as autonomous authority.**

The AI generates a structured draft. A human must review, optionally edit, and explicitly approve before any action is taken in Jira.

### 5.2 Architectural Enforcement

```
                                          ┌─────────────────────┐
  User submits                            │  AI / Stub returns  │
  requirement text ───► POST /api/ai/ ───►│  normalized draft   │
                        parse-requirements│  (in-memory only)   │
                                          └────────┬────────────┘
                                                   │
                                          ┌────────▼────────────┐
                                          │  User reviews draft │
                                          │  in Preview/Edit UI │
                                          │  (can edit/delete/  │
                                          │   add items)        │
                                          └────────┬────────────┘
                                                   │
                                     User clicks   │  "Publish to Jira"
                                                   │
                                          ┌────────▼────────────┐
                                          │  POST /publish      │
                                          │  (requires Jira     │
                                          │   session auth)     │
                                          └─────────────────────┘
```

### 5.3 Controls Preventing Autonomous Action

| Control                                           | Evidence                                                      |
| ------------------------------------------------- | ------------------------------------------------------------- |
| Draft stored in-memory, not in Jira               | `workbreakdown-store.ts` — `Map<string, WorkBreakdown>`       |
| Publish is a separate, auth-gated endpoint        | `publish/route.ts:29-30` — `getJiraUserIdFromSession()`       |
| User can edit every field before publishing       | `WorkBreakdownPreviewView.tsx`, `WorkBreakdownEditForm.tsx`   |
| User can delete items from the draft              | `PATCH /api/workbreakdown/[draftId]` with `op: "delete"`      |
| No background/scheduled AI-to-Jira pipeline       | No cron jobs, no queue workers, no background processors      |
| Each Jira issue creation is individually reported | `publish/route.ts` — `result.created[]` and `result.errors[]` |

---

## 6. AI Provider Governance

### 6.1 Provider: OpenAI

| Aspect           | Detail                                                                      |
| ---------------- | --------------------------------------------------------------------------- |
| Provider         | OpenAI (via `openai` npm package)                                           |
| Model            | `gpt-4o`                                                                    |
| API type         | Chat Completions API (stateless, no fine-tuning)                            |
| Data usage       | API inputs are **not** used for training per OpenAI's API data usage policy |
| Data retention   | Up to 30 days for abuse monitoring, then deleted                            |
| SOC 2 compliance | OpenAI holds SOC 2 Type II certification                                    |
| Data residency   | OpenAI processes data in the United States                                  |

### 6.2 Provider Selection Criteria

- Stateless API (no conversation history retained by default)
- Explicit data usage policy (no training on API data)
- JSON mode support (`response_format: json_object`)
- Industry-standard security certifications

### 6.3 Fallback

When OpenAI is unreachable or the API key is invalid, the endpoint fails with a 422 error. The stub fallback is only used when **no API key is configured**, not on API errors.

---

## 7. Incident Response & Escalation

### 7.1 AI-Specific Incidents

| Incident type                                | Response                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| AI produces harmful/inappropriate content    | User discards the draft (no auto-publish). Report to engineering for prompt review.                      |
| OpenAI API key compromised                   | Rotate key immediately in environment. No user-facing data affected (key is server-only).                |
| Unexpected AI costs                          | Disable feature flag (`NEXT_PUBLIC_ENABLE_AI_TASK_CREATION=false`) or remove API key. Review usage logs. |
| AI output bypass (schema validation failure) | Endpoint returns 422 error. Review logs for pattern. Update normalization/schema if needed.              |
| Prompt injection attempt                     | Output pipeline sanitizes; Zod rejects non-conforming output. Log and review if pattern emerges.         |

### 7.2 Kill Switch Procedure

To immediately disable AI in production:

1. Set `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION=false` and redeploy (hides UI).
2. Remove or blank `OPENAI_API_KEY` (forces stub on any direct API call).
3. Both steps together ensure zero external AI calls and no AI UI.

---

## 8. Audit Evidence

### 8.1 Code-Level Evidence

Full file-referenced security evidence for the AI integration is maintained in:

**[`docs/compliance/ai-integration-security-evidence.md`](../compliance/ai-integration-security-evidence.md)**

Covers: endpoint validation, Zod schema enforcement, multi-stage output pipeline, stub behavior, draft lifecycle, publish auth gate, prompt design, model configuration, and environment variable security.

### 8.2 Environment Configuration Evidence

| File           | Content                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| `.env.example` | Documents both AI variables with comments explaining scope and defaults         |
| `.env.local`   | `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION=false` set; `OPENAI_API_KEY` commented out |

### 8.3 Test Coverage Evidence

| Test file                                           | Coverage                           |
| --------------------------------------------------- | ---------------------------------- |
| `src/lib/__tests__/workbreakdown-normalize.spec.ts` | AI output normalization edge cases |

### 8.4 Compliance Cross-References

| Document                                                                                   | Relevance                                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [`security-controls-evidence.md`](../compliance/security-controls-evidence.md)             | §1.6 AI Output Validation, §1.1 Zod schemas                               |
| [`security-source-code-and-secrets.md`](../compliance/security-source-code-and-secrets.md) | `OPENAI_API_KEY` and `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION` classification |
| [`privacy-policy.md`](../compliance/privacy-policy.md)                                     | Data processing and subprocessor disclosures                              |
| [`dpa.md`](../compliance/dpa.md)                                                           | Technical and organizational measures                                     |

---

## 9. Review Cadence

| Review                | Frequency                             | Owner                  |
| --------------------- | ------------------------------------- | ---------------------- |
| Policy review         | Quarterly or on AI feature changes    | Engineering Lead       |
| Provider terms review | Annually or on provider policy change | Security               |
| Prompt review         | On each prompt modification           | Engineering            |
| Access control review | On AI feature enablement              | Engineering + Security |
| Cost/usage review     | Monthly when AI is enabled            | Engineering            |

---

_This document must be reviewed and updated whenever the AI integration is modified, a new AI provider is added, or the feature is enabled for production release._
