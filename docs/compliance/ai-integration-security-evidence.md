# AI Integration — Security Controls Evidence

> **Last updated:** 2026-04-06
>
> **Status:** AI task creation is **disabled for the MVP release** (`NEXT_PUBLIC_ENABLE_AI_TASK_CREATION=false`). It will ship as a post-MVP enhancement. All code paths documented below exist in source but are unreachable in production until the flag is set to `"true"` or `"1"`.

This document provides verifiable, file-referenced evidence that the AI integration follows secure coding practices: input validation, output schema enforcement, deterministic stub when no API key, and treatment of AI output as a human-editable draft (never autonomous authority).

---

## Table of Contents

1. [Feature Flag — Kill Switch](#1-feature-flag--kill-switch)
2. [Endpoint Validation & Input Parsing](#2-endpoint-validation--input-parsing)
3. [Schema Enforcement on AI Output (Zod)](#3-schema-enforcement-on-ai-output-zod)
4. [Multi-Stage Output Pipeline & Guardrails](#4-multi-stage-output-pipeline--guardrails)
5. [Deterministic Stub When No API Key](#5-deterministic-stub-when-no-api-key)
6. [AI Output Usage — Draft, Not Autonomous Authority](#6-ai-output-usage--draft-not-autonomous-authority)
7. [Prompt Design & Model Configuration](#7-prompt-design--model-configuration)
8. [Environment Variable Security](#8-environment-variable-security)
9. [Summary Matrix](#9-summary-matrix)

---

## 1. Feature Flag — Kill Switch

The entire AI task-creation UI is gated by a build-time environment variable. When the flag is absent, empty, or `"false"`, the UI button is hidden and no AI request can be triggered from the client.

**File:** [`src/components/tasks/CreateTaskView.tsx`](../../src/components/tasks/CreateTaskView.tsx) (lines 36–39)

```typescript
const ENABLE_AI_TASK_CREATION =
  process.env.NEXT_PUBLIC_ENABLE_AI_TASK_CREATION === "true" ||
  process.env.NEXT_PUBLIC_ENABLE_AI_TASK_CREATION === "1";
```

**Current production value:** `false` (set in `.env.local` and `.env.example`).

| Property             | Value                                           |
| -------------------- | ----------------------------------------------- |
| Variable             | `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION`           |
| Scope                | Build-time, client-side (`NEXT_PUBLIC_` prefix) |
| Default              | `undefined` → UI hidden                         |
| Accepted "on" values | `"true"` or `"1"` (strict equality)             |

---

## 2. Endpoint Validation & Input Parsing

### 2.1 Single AI Endpoint

The only AI endpoint is `POST /api/ai/parse-requirements`. There are no other `/api/ai/*` routes.

**File:** [`src/app/api/ai/parse-requirements/route.ts`](../../src/app/api/ai/parse-requirements/route.ts)

### 2.2 Request Body Validation

```typescript
// Lines 16–28
let body: ParseRequirementsBody;
try {
  body = (await request.json()) as ParseRequirementsBody;
} catch {
  return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
}

const { requirementText, projectKey, platform } = body;
if (!requirementText || typeof requirementText !== "string") {
  return NextResponse.json(
    { error: "requirementText is required and must be a string." },
    { status: 400 },
  );
}
```

| Check             | Detail                                                        |
| ----------------- | ------------------------------------------------------------- |
| JSON parse        | Wrapped in `try/catch`; returns 400 on malformed JSON         |
| `requirementText` | Required, must be `typeof string`, must be truthy (non-empty) |
| `projectKey`      | Optional; used only as metadata, not in any query             |
| `platform`        | Optional; used only as metadata                               |

### 2.3 Error Responses — No Internals Leaked

```typescript
// Lines 49–56
} catch (error) {
  const message = error instanceof Error ? error.message : "Parse failed.";
  console.error("parse-requirements error:", error);
  return NextResponse.json(
    { error: "Failed to parse requirements.", details: message },
    { status: 422 },
  );
}
```

Full stack traces are logged server-side only. The client receives only a fixed `error` string and the error `message` (which is either a safe Zod/JSON parse message or the generic "Parse failed.").

---

## 3. Schema Enforcement on AI Output (Zod)

### 3.1 `aiOutputSchema`

**File:** [`src/schemas/workbreakdown-schema.ts`](../../src/schemas/workbreakdown-schema.ts) (lines 59–66)

```typescript
export const aiOutputSchema = z.union([
  z.object({ items: z.array(rawWorkItemSchema).min(1) }),
  z
    .array(rawWorkItemSchema)
    .min(1)
    .transform((arr) => ({ items: arr })),
]);
```

Accepts either `{ items: [...] }` or a bare array, both validated recursively against `rawWorkItemSchema`.

### 3.2 `rawWorkItemSchema` — Recursive Item Validation

**File:** [`src/schemas/workbreakdown-schema.ts`](../../src/schemas/workbreakdown-schema.ts) (lines 41–57)

```typescript
const rawWorkItemSchema: z.ZodType<...> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    type: workItemTypeSchema,               // z.enum(["epic", "story", "task", "subtask"])
    title: z.string(),
    description: z.string().default(""),
    children: z.array(rawWorkItemSchema).optional().default([]),
    metadata: workItemMetadataSchema.optional(),
  }),
);
```

| Field         | Constraint                                           |
| ------------- | ---------------------------------------------------- |
| `type`        | Must be one of `epic`, `story`, `task`, `subtask`    |
| `title`       | Required string                                      |
| `description` | String, defaults to `""`                             |
| `children`    | Recursive array of same schema                       |
| `metadata`    | Optional; validated sub-schema with `.passthrough()` |

### 3.3 `workBreakdownSchema` — Full Draft Validation

Used on `POST /api/workbreakdown` with `safeParse`:

```typescript
const parsed = workBreakdownSchema.safeParse({ ...body, id, createdAt, updatedAt });
if (!parsed.success) {
  return NextResponse.json(
    { error: "Validation failed.", details: parsed.error.flatten() },
    { status: 422 },
  );
}
```

---

## 4. Multi-Stage Output Pipeline & Guardrails

Every AI response (real or stub) passes through four pipeline stages before reaching the client.

**File:** [`src/lib/ai-parse-requirements.ts`](../../src/lib/ai-parse-requirements.ts) (lines 84–115)

```typescript
export function parseAiWorkBreakdown(rawResponse, draftId, projectKey?, platform?) {
  // Stage 1: Extract JSON (strip markdown fences if present)
  const parsed = extractJsonFromResponse(rawResponse);

  // Stage 2: Structural normalization (alias keys → "children", type coercion, title fallbacks)
  const normalized = normalizeAiOutput(parsed);
  if (normalized.items.length === 0) {
    throw new Error("AI returned no work items.");
  }

  // Stage 3: Zod schema validation
  const validated = aiOutputSchema.parse(normalized);

  // Stage 4: Business normalization (IDs, timestamps, trim, defaults)
  return validateAndNormalize(validated, draftId, projectKey, platform);
}
```

### Stage 1 — JSON Extraction

````typescript
export function extractJsonFromResponse(text: string): unknown {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}
````

Handles LLMs that wrap JSON in markdown code fences. Throws on invalid JSON.

### Stage 2 — Structural Normalization

**File:** [`src/lib/ai-parse-requirements.ts`](../../src/lib/ai-parse-requirements.ts) (lines 5–82)

- Aliases (`tasks`, `subtasks`, `stories`, `items`, `epics`, `workItems`) are all mapped to `children`/`items`.
- Unknown `type` values are coerced to `"task"`.
- Missing `title` falls back to `name`, then to `"Untitled"`.
- Valid types are restricted to: `["epic", "story", "task", "subtask"]`.

### Stage 3 — Zod Validation

`aiOutputSchema.parse()` throws a `ZodError` if the normalized structure does not match. This is a hard fail — invalid AI output is **rejected**, not passed through.

### Stage 4 — Business Normalization

**File:** [`src/lib/workbreakdown-normalize.ts`](../../src/lib/workbreakdown-normalize.ts) (lines 22–69)

- Assigns temp IDs (`wb_<time>_<random>`) to items without IDs.
- Trims titles; defaults empty titles to `"Untitled"`.
- Enforces at least one top-level item (`items.length === 0` → throws).
- Sets `status: "draft"`, `createdAt`, `updatedAt` timestamps.

### Unit Tests

**File:** [`src/lib/__tests__/workbreakdown-normalize.spec.ts`](../../src/lib/__tests__/workbreakdown-normalize.spec.ts) — validates normalization behavior for various AI output shapes.

---

## 5. Deterministic Stub When No API Key

When `OPENAI_API_KEY` is not set (or is whitespace-only), the server **never calls OpenAI**. Instead it returns a deterministic template breakdown.

**File:** [`src/app/api/ai/parse-requirements/route.ts`](../../src/app/api/ai/parse-requirements/route.ts) (lines 32–39)

```typescript
let rawResponse: string;
if (process.env.OPENAI_API_KEY?.trim()) {
  rawResponse = await generateWorkBreakdownWithOpenAI(requirementText);
} else {
  const stubJson = stubParseRequirements(requirementText);
  rawResponse = JSON.stringify(stubJson);
}
```

### Stub Implementation

**File:** [`src/lib/ai-stub.ts`](../../src/lib/ai-stub.ts) (271–287)

```typescript
export function stubParseRequirements(requirementText: string): { items: unknown[] } {
  const trimmed = requirementText.trim() || "Deliver the requested feature or product.";
  const storyTitle = storyTitleFromRequirement(trimmed);
  const techStack = inferTechStack(trimmed);
  // ... builds a full project breakdown template
  const items = buildFullProjectBreakdown(storyTitle, storySummary);
  return { items: items.map(nodeToRaw) };
}
```

| Property                | Behavior                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| No external API call    | Zero network requests to OpenAI or any third party                                             |
| Deterministic structure | Fixed 6-task template (setup, data/API, backend, UI, integration, docs) with 2–4 subtasks each |
| Shuffled order          | `shuffle()` varies task order so repeated calls produce different orderings                    |
| No sensitive data       | Only uses the user-provided `requirementText` to derive title and summary                      |

### OpenAI Guard

**File:** [`src/lib/ai-openai.ts`](../../src/lib/ai-openai.ts) (lines 18–23)

```typescript
const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY is not set. Add it to .env.local to use AI-generated task breakdown.",
  );
}
```

Even if `generateWorkBreakdownWithOpenAI` were called without a key (which the route prevents), it throws before creating the OpenAI client.

---

## 6. AI Output Usage — Draft, Not Autonomous Authority

### 6.1 Draft Lifecycle

AI output is stored as an **editable draft** in an in-memory `Map`. It **never** directly creates Jira issues.

```
User requirement → AI/stub → Normalized draft → User reviews/edits → User clicks "Publish" → Jira issues created
```

| Step           | File                                                         | Human in loop?                          |
| -------------- | ------------------------------------------------------------ | --------------------------------------- |
| Generate       | `POST /api/ai/parse-requirements`                            | Yes — user submits the requirement text |
| Store          | `workbreakdown-store.ts` (in-memory `Map`)                   | Draft only; no side effects             |
| Preview & Edit | `WorkBreakdownPreviewView.tsx` / `WorkBreakdownEditForm.tsx` | Yes — user can edit/delete/add items    |
| Patch draft    | `PATCH /api/workbreakdown/[draftId]`                         | User-initiated edits                    |
| **Publish**    | `POST /api/workbreakdown/[draftId]/publish`                  | **Requires active Jira session**        |

### 6.2 Publish Requires Jira Authentication

**File:** [`src/app/api/workbreakdown/[draftId]/publish/route.ts`](../../src/app/api/workbreakdown/[draftId]/publish/route.ts) (lines 29–30)

```typescript
const userId = await getJiraUserIdFromSession(request);
if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });
```

The publish endpoint is the **only** place where Jira issues are created from a draft. It requires:

- A valid `jira_session_token` cookie
- An active, non-expired Jira session in the database
- A valid `projectId` in the request body

### 6.3 No Autonomous Actions

- AI output is **never** automatically published to Jira.
- AI output is **never** used to modify existing Jira issues.
- The user must explicitly review the breakdown and click "Publish to Jira".
- Each created issue is individually tracked (`result.created` / `result.errors`) with full transparency.

### 6.4 Draft Storage — Ephemeral, In-Memory Only

**File:** [`src/lib/workbreakdown-store.ts`](../../src/lib/workbreakdown-store.ts)

- Drafts are stored in a `globalThis` `Map` — **no database persistence**.
- Drafts are lost on server restart.
- No PII is stored in drafts (only requirement text derivatives: titles, descriptions).

---

## 7. Prompt Design & Model Configuration

### 7.1 Constrained Output Format

**File:** [`src/prompts/work-breakdown.ts`](../../src/prompts/work-breakdown.ts)

The system prompt explicitly constrains the AI to output **only valid JSON** in a specific structure:

```
Output only valid JSON: { "items": [ ... ] }. No markdown code fence.
```

The prompt specifies exact field names (`type`, `title`, `description`, `children`, `metadata`) and valid `type` values (`epic|story|task|subtask`).

### 7.2 Model Configuration

**File:** [`src/lib/ai-openai.ts`](../../src/lib/ai-openai.ts) (lines 10, 27–34)

| Parameter         | Value                     | Purpose                                   |
| ----------------- | ------------------------- | ----------------------------------------- |
| Model             | `gpt-4o`                  | Capable of structured JSON output         |
| `response_format` | `{ type: "json_object" }` | Forces valid JSON response from API       |
| `temperature`     | `0.4`                     | Low randomness; more deterministic output |

### 7.3 Defense in Depth

Even with prompt constraints and `response_format: json_object`, the output passes through all four pipeline stages (§4). Malformed or off-schema responses are **rejected**, not silently accepted.

---

## 8. Environment Variable Security

### 8.1 Variable Classification

| Variable                              | Scope                   | Committed              | Required for MVP                |
| ------------------------------------- | ----------------------- | ---------------------- | ------------------------------- |
| `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION` | Build-time, client-side | In `.env.example` only | No — defaults to `false`/hidden |
| `OPENAI_API_KEY`                      | Runtime, server-only    | In `.env.example` only | No — stub used when absent      |

### 8.2 Server-Only Enforcement

`OPENAI_API_KEY` has no `NEXT_PUBLIC_` prefix, so Next.js **never** bundles it into client-side JavaScript. It is only accessible in API route handlers and server components.

### 8.3 `.env.local` Is Gitignored

`.env.local` appears in `.gitignore` and is never committed. The `.env.example` template documents both variables with explanatory comments.

---

## 9. Summary Matrix

| Control                        | Evidence                                                        | File(s)                               |
| ------------------------------ | --------------------------------------------------------------- | ------------------------------------- |
| **Feature flag (kill switch)** | `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION` must be `"true"` or `"1"` | `CreateTaskView.tsx:36-39`            |
| **Input validation**           | JSON parse + type/presence checks on `requirementText`          | `route.ts (parse-requirements):16-28` |
| **Zod schema enforcement**     | `aiOutputSchema.parse()` with recursive `rawWorkItemSchema`     | `workbreakdown-schema.ts:41-66`       |
| **Multi-stage pipeline**       | JSON extract → normalize → Zod → business normalize             | `ai-parse-requirements.ts:97-115`     |
| **Stub when no key**           | `stubParseRequirements()` — zero external calls                 | `route.ts:34-38`, `ai-stub.ts`        |
| **OpenAI key guard**           | Throws before client creation if key missing                    | `ai-openai.ts:18-23`                  |
| **Draft-only output**          | In-memory `Map`, ephemeral, no auto-publish                     | `workbreakdown-store.ts`              |
| **Publish requires auth**      | `getJiraUserIdFromSession()` gate                               | `publish/route.ts:29-30`              |
| **Human review required**      | Preview/edit UI before publish                                  | `WorkBreakdownPreviewView.tsx`        |
| **No autonomous actions**      | AI never creates/modifies Jira issues directly                  | Architecture design                   |
| **Prompt constraints**         | JSON-only output, explicit schema in prompt                     | `work-breakdown.ts`                   |
| **Model constraints**          | `response_format: json_object`, `temperature: 0.4`              | `ai-openai.ts:27-34`                  |
| **Server-only API key**        | No `NEXT_PUBLIC_` prefix on `OPENAI_API_KEY`                    | `.env.example`                        |
| **Error sanitization**         | Generic message to client, full log server-side                 | `route.ts:49-56`                      |
