# Observability Implementation Plan

> **Status:** Superseded — core implementation lives in `libs/observability/` (see `libs/observability/README.md`).  
> This document is retained as the original design spec and backlog for remaining event integrations.  
> **Location:** `docs/architecture/observability-design-spec.md` (formerly `observability-todo.md` at repo root).  
> **Scope:** Platform-agnostic, capability-aware observability layer — Vercel-first, extensible to Prometheus/Grafana/Google Analytics  
> **Principles:** Zero performance impact, structured logs, business + technical metrics, PlatformCapabilities-aware

---

## Architecture Overview

```
libs/observability/                    ← Vendor-neutral telemetry core (shared across all platform apps)
  src/
    types/
      events.ts                        ← Canonical event schema (platform-agnostic)
      metrics.ts                       ← Named metric definitions
      logger.ts                        ← Log level + structured log record types
    core/
      logger.ts                        ← Structured logger abstraction (wraps Pino server-side)
      tracer.ts                        ← OpenTelemetry span factory (via @opentelemetry/api)
      metrics-recorder.ts              ← Counter/histogram/gauge abstraction
      error-reporter.ts                ← Error capture + threshold alerting
    events/
      business.ts                      ← Business event builder functions (typed, documented)
      technical.ts                     ← Technical event builder functions (API timing, errors)
      capability-filter.ts             ← Strips events whose capability flag is false for this platform
    exporters/
      vercel.ts                        ← @vercel/analytics + @vercel/otel bridge
      otlp.ts                          ← OTLP/HTTP exporter for Prometheus, Grafana, Datadog
      google-analytics.ts              ← gtag bridge (web events only)
      console.ts                       ← Dev-mode pretty exporter (no-op in prod)
    middleware/
      withObservability.ts             ← Next.js API route wrapper: timing + error capture
    hooks/
      useEventTracker.ts               ← Client: fire business/UI events (non-blocking)
      usePageTracking.ts               ← Client: route-change page views
      usePerformanceTracker.ts         ← Client: component render timing via PerformanceObserver
    index.ts                           ← Public barrel

apps/jira/
  instrumentation.ts                   ← Next.js built-in: initialise @vercel/otel on server boot
  src/
    app/
      layout.tsx                       ← Add <Analytics />, <SpeedInsights /> (Vercel)
    lib/
      observability.ts                 ← Jira-specific event helpers (wraps libs/observability)
    middleware.ts                      ← Edge middleware: request-level tracing + rate limit recording
```

**Data flow:**

```
User action / API call
      │
      ▼
[Event Builder] (typed, capability-filtered)
      │
      ▼
[ObservabilityClient] (singleton, initialised at app boot)
      │
      ├─► [Vercel Analytics]     → Vercel Dashboard (business events, page views)
      ├─► [Vercel OTel / OTLP]  → Vercel Observability → log drain → Grafana / Datadog
      ├─► [Google Analytics]     → GA4 (optional, web events)
      └─► [Console exporter]     → Dev terminal only
```

---

## Event Schema (canonical, platform-agnostic)

Every event sent to any exporter conforms to this shape:

```typescript
// libs/observability/src/types/events.ts

type EventCategory = "page" | "user_action" | "api" | "error" | "performance" | "business";
type EventSeverity = "info" | "warn" | "error" | "critical";

interface ObservabilityEvent {
  // ── Identity ───────────────────────────────────────────
  eventName: string; // e.g. "task.created", "api.issues.list"
  category: EventCategory;
  platform: string; // "jira" | "monday" | "wrike"  (from PlatformCapabilities)
  appVersion: string; // NEXT_PUBLIC_APP_VERSION or git SHA

  // ── Timing ─────────────────────────────────────────────
  timestamp: number; // Date.now()
  duration?: number; // ms — present on api / performance events

  // ── Session ────────────────────────────────────────────
  sessionId: string; // anonymous rotating ID (localStorage, no PII)
  userId?: string; // SHA-256 of accountId — never plain PII

  // ── Business dimensions ────────────────────────────────
  properties: Record<string, string | number | boolean>;

  // ── Error ──────────────────────────────────────────────
  severity?: EventSeverity;
  errorCode?: string;
  errorStack?: string; // only in dev or server-side
}
```

---

## Business Metrics

These events capture organisational intelligence: who uses each app, how often, which features they rely on, and whether the product is delivering productivity value over time.

### Group 1 — Session Identity

Answers: who is using the app right now, and from which platform?

| Event Name          | Key Properties                          | Notes                                                                                                               |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `session.started`   | `platform`, `appVersion`, `userRole?`   | Fire on first meaningful interaction after page load (not on bot/prefetch)                                          |
| `session.ended`     | `durationMs`, `actionCount`, `platform` | Fire on `visibilitychange → hidden`; best-effort, may be lost on hard close                                         |
| `session.heartbeat` | `platform`, `activeMs`                  | Client-side only. Fire every 5 min while page is visible — measures true active time vs tab open time               |
| `user.role_signal`  | `role`, `platform`                      | Fire when a user's role/permission tier becomes visible (e.g. from Jira profile API response). One-shot per session |

### Group 2 — Adoption Funnel

Answers: are users completing the onboarding journey and becoming active?

| Event Name                 | Key Properties                                        | Capability Guard |
| -------------------------- | ----------------------------------------------------- | ---------------- |
| `app.first_opened`         | `platform`, `appVersion`                              | —                |
| `app.connection_completed` | `platform`, `connectionMethod`                        | —                |
| `app.first_task_actioned`  | `platform`, `actionType` (`view`\|`create`\|`update`) | —                |
| `app.onboarding_completed` | `platform`, `stepsCompleted`                          | —                |

> **Funnel:** `app.first_opened` → `app.connection_completed` → `app.first_task_actioned` → `app.onboarding_completed`

### Group 3 — View Engagement

Answers: which views are most popular, how long do users spend in each, and do they come back?

| Event Name       | Key Properties                       | Notes                                                                  |
| ---------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `view.entered`   | `viewName`, `platform`, `referrer?`  | Fire on mount / route change into the view                             |
| `view.exited`    | `viewName`, `durationMs`, `platform` | Fire on unmount / route change away                                    |
| `view.revisited` | `viewName`, `visitCountThisSession`  | Fire on 2nd+ entry to same view in a session — signals high engagement |

`viewName` values: `task-list`, `task-detail`, `create-task`, `edit-task`, `work-breakdown`, `connection-setup`, `settings`.

### Group 4 — Feature Adoption & Stickiness

Answers: which features are discovered, used regularly, and which are abandoned?

| Event Name                       | Key Properties                            | Capability Guard                                                        |
| -------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| `feature.first_used`             | `featureKey`, `platform`                  | First ever use — stored flag in localStorage to avoid re-firing         |
| `feature.used`                   | `featureKey`, `platform`, `sessionCount?` | Every use — aggregated server-side for frequency                        |
| `feature.abandoned`              | `featureKey`, `abandonStage`              | User opened feature flow but navigated away before completion           |
| `feature.reused_across_sessions` | `featureKey`, `daysSinceFirstUse`         | Fire when same feature used in 3+ distinct sessions — stickiness signal |

`featureKey` values: `ai-breakdown`, `comments`, `attachments`, `status-transitions`, `filters`, `site-picker`, `project-picker`.

### Group 5 — Productivity / AI ROI

Answers: is the product saving users time, and is the AI feature delivering value?

| Event Name                        | Key Properties                                            | Capability Guard     | Notes                                                                                                    |
| --------------------------------- | --------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| `productivity.task_actioned`      | `actionType`, `platform`, `durationMs`                    | —                    | Time from view open to action complete — measures UX speed                                               |
| `productivity.workflow_completed` | `workflowName`, `stepCount`, `totalDurationMs`            | —                    | End-to-end workflows (e.g. create + assign + set due date)                                               |
| `ai_breakdown.generated`          | `subtaskCount`, `durationMs`                              | `hasAiWorkBreakdown` | —                                                                                                        |
| `ai_breakdown.published`          | `subtaskCount`, `estimatedTimeSavedMin`                   | `hasAiWorkBreakdown` | `estimatedTimeSavedMin = subtaskCount × AI_TIME_SAVED_PER_SUBTASK_MIN` (configurable, default **7 min**) |
| `ai.acceptance_rate_signal`       | `generatedCount`, `publishedCount`, `acceptanceRate`      | `hasAiWorkBreakdown` | Fire when user publishes; `acceptanceRate = publishedCount / generatedCount`                             |
| `collaboration.signal`            | `signalType` (`comment`\|`assign`\|`mention`), `platform` | —                    | Lightweight proxy for multi-user collaboration depth                                                     |

> **Config constant:** `AI_TIME_SAVED_PER_SUBTASK_MIN` — stored in `libs/observability/src/config/constants.ts`, default `7`. Overridable via `NEXT_PUBLIC_AI_TIME_SAVED_PER_SUBTASK_MIN` env var.

### Group 6 — Platform Growth & Popularity

Answers: which platforms are growing, and where is adoption concentrated?

| Event Name                   | Key Properties                       | Notes                                                                                                   |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `app.daily_active`           | `platform`, `date`                   | One per user per calendar day — deduped in client via localStorage date stamp                           |
| `app.platform_coverage`      | `platform`, `connectedSiteCount`     | Fire when connection list loads — measures multi-site breadth per user                                  |
| `platform.popularity_signal` | `platform`, `rank`, `totalPlatforms` | Fire at session start; `rank` derived from localStorage DAU counters across platforms the user has used |

### Group 7 — Retention Health

Answers: are users coming back, and can we spot churn before it happens?

| Event Name                 | Key Properties                                         | Notes                                                                                             |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `app.returned_after_gap`   | `platform`, `daysSinceLastSession`                     | Fire when gap > 3 days — measures re-engagement                                                   |
| `app.churned_signal`       | `platform`, `daysSinceLastSession`                     | Fire client-side on session start when gap ≥ **14 days** — early churn warning                    |
| `retention.weekly_active`  | `platform`, `weekNumber`                               | One per user per ISO week — deduped via localStorage                                              |
| `retention.streak`         | `platform`, `streakDays`                               | Current consecutive-day streak — fire on session start; reset on gap > 1 day                      |
| `connection.health_signal` | `platform`, `status` (`healthy`\|`degraded`\|`broken`) | Fire when OAuth token age or refresh failure pattern is detected                                  |
| `error.user_visible`       | `errorType`, `platform`, `viewName`                    | User-facing errors only (not background API failures) — correlates error rate with retention drop |

---

## Technical Metrics

These events track system health and performance SLIs.

| Event Name             | Category    | Key Properties                                   | Notes                                    |
| ---------------------- | ----------- | ------------------------------------------------ | ---------------------------------------- |
| `api.request`          | api         | `endpoint`, `method`, `statusCode`, `durationMs` | Every proxied Jira API call              |
| `api.error`            | error       | `endpoint`, `statusCode`, `errorCode`            | Fires alongside `api.request` on 4xx/5xx |
| `api.slow`             | performance | `endpoint`, `durationMs`, `threshold`            | Fires when response > 3 s                |
| `api.retry`            | api         | `endpoint`, `attempt`                            | Repeated calls to same endpoint          |
| `web_vitals.lcp`       | performance | `value`, `rating`                                | Largest Contentful Paint                 |
| `web_vitals.cls`       | performance | `value`, `rating`                                | Cumulative Layout Shift                  |
| `web_vitals.inp`       | performance | `value`, `rating`                                | Interaction to Next Paint                |
| `web_vitals.ttfb`      | performance | `value`, `rating`                                | Time to First Byte                       |
| `error.unhandled`      | error       | `message`, `severity`, `path`                    | Caught by ErrorBoundary + global handler |
| `error.react_boundary` | error       | `componentStack`, `severity`                     | React ErrorBoundary                      |
| `render.slow`          | performance | `component`, `durationMs`                        | Components > 100 ms render               |
| `auth.token_refreshed` | api         | `platform`                                       | OAuth refresh cycle                      |
| `auth.refresh_failed`  | error       | `platform`, `errorCode`                          | Refresh failure → user re-auth           |

---

## Alert Thresholds (configurable)

A thin server-side threshold evaluator fires a webhook/email when limits are breached.

```yaml
# libs/observability/src/config/thresholds.yaml  (checked in, overridable via env)
alerts:
  error_rate:
    window_minutes: 5
    max_errors: 10
    severity: critical
    notify:
      - email: ${ALERT_EMAIL}
      - webhook: ${ALERT_WEBHOOK_URL}

  api_slow:
    threshold_ms: 3000
    consecutive_count: 3
    notify:
      - email: ${ALERT_EMAIL}

  auth_refresh_failure:
    window_minutes: 10
    max_failures: 3
    notify:
      - email: ${ALERT_EMAIL}
      - webhook: ${ALERT_WEBHOOK_URL}
```

---

## Capability-Aware Filtering

Events guarded by a capability flag are silently dropped at the exporter level if that flag is `false` for the running platform. This means Monday.com (no `hasComments`) never emits `comment.added`, without any code change.

```typescript
// libs/observability/src/events/capability-filter.ts
const CAPABILITY_GUARDS: Partial<Record<string, keyof PlatformCapabilities>> = {
  "task.status_changed": "hasStatusTransitions",
  "comment.added": "hasComments",
  "attachment.uploaded": "hasAttachments",
  "site.selected": "hasSites",
  "ai_breakdown.generated": "hasAiWorkBreakdown",
  "ai_breakdown.published": "hasAiWorkBreakdown",
};
```

---

## Implementation Tasks

### PHASE 1 — Core library scaffold

- [ ] **OBS-01** Create `libs/observability/` project: `project.json`, `tsconfig.json`, `src/index.ts`
- [ ] **OBS-02** Define canonical `ObservabilityEvent` type + `EventCategory` + `EventSeverity` in `types/events.ts`
- [ ] **OBS-03** Define named metric constants (`METRIC_NAMES`) in `types/metrics.ts`
- [ ] **OBS-04** Define structured log record type (`LogRecord`, `LogLevel`) in `types/logger.ts`
- [ ] **OBS-05** Create `ObservabilityClient` singleton class with `track(event)`, `log(record)`, `startSpan()` methods; accepts array of exporters at init time (`core/client.ts`)
- [ ] **OBS-06** Create abstract `BaseExporter` interface: `export(event: ObservabilityEvent): void` (fire-and-forget, never throws)
- [ ] **OBS-07** Create `ConsoleExporter` (dev-only, pretty-prints): `exporters/console.ts`
- [ ] **OBS-08** Implement capability-filter guard in `events/capability-filter.ts`; `ObservabilityClient.track()` calls this before dispatching to exporters

### PHASE 2 — Structured server-side logger (Pino)

- [ ] **OBS-09** Add `pino` + `pino-http` to root `package.json`
- [ ] **OBS-10** Create `core/logger.ts`: exports `createLogger(context)` — thin Pino wrapper that always emits JSON with `platform`, `requestId`, `timestamp` context fields; no-ops in browser
- [ ] **OBS-11** Create `middleware/withObservability.ts`: Next.js API route HOF that wraps each handler — records `api.request` event with timing, catches thrown errors as `api.error` events, attaches `X-Request-Id` response header
- [ ] **OBS-12** Wire `withObservability` into all existing apps/jira API routes via a single-pass script (PowerShell batch wrap); verify on 3 routes manually

### PHASE 3 — Vercel integration

- [ ] **OBS-13** Add `@vercel/analytics`, `@vercel/speed-insights`, `@vercel/otel` to `package.json`
- [ ] **OBS-14** Create `apps/jira/instrumentation.ts` — calls `registerOTel({ serviceName: "jira-task-view" })` from `@vercel/otel`; runs on both server and edge runtimes
- [ ] **OBS-15** Create `exporters/vercel.ts`: implements `BaseExporter`, calls `track()` from `@vercel/analytics` for `page` and `business` category events; maps `ObservabilityEvent` fields to Vercel custom event properties
- [ ] **OBS-16** Create `exporters/vercel-otel.ts`: maps `api` + `error` + `performance` events to OpenTelemetry spans/metrics via `@opentelemetry/api`; Vercel OTel SDK ships these to Vercel's backend automatically
- [ ] **OBS-17** Inject `<Analytics />` and `<SpeedInsights />` from Vercel into `apps/jira/src/app/layout.tsx`
- [ ] **OBS-18** Create `hooks/usePageTracking.ts`: listens to Next.js router events, fires `page.viewed` event via `ObservabilityClient` — registered once in `Providers.tsx`
- [ ] **OBS-19** Verify Web Vitals appear in Vercel Speed Insights dashboard end-to-end

### PHASE 4 — OpenTelemetry / OTLP exporter (future-proof backend)

- [ ] **OBS-20** Add `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-otlp-http` to `package.json`
- [ ] **OBS-21** Create `exporters/otlp.ts`: sends events as OTLP spans + metrics to `OTEL_EXPORTER_OTLP_ENDPOINT` env var; disabled if var is absent (so it's a zero-config no-op by default)
- [ ] **OBS-22** Create `core/tracer.ts`: wraps `@opentelemetry/api` tracer; exports `startSpan(name, attributes)` → `Span` with `.end()` convenience; used in `withObservability` middleware
- [ ] **OBS-23** Document env vars needed to connect Grafana/Prometheus in `docs/observability-backends.md`

### PHASE 5 — Business event tracking (client-side React hooks)

- [ ] **OBS-24** Create `hooks/useEventTracker.ts`: returns `track(eventName, properties)` — reads `platform` from `usePlatformCapabilities()`, applies capability filter, dispatches via `ObservabilityClient` asynchronously in a `queueMicrotask`/`requestIdleCallback` to avoid blocking UI
- [ ] **OBS-25** Create `events/business.ts`: typed builder functions for every business event in the metrics table above — e.g. `buildTaskCreatedEvent(args)`, `buildCommentAddedEvent(args)`; all return `ObservabilityEvent`
- [ ] **OBS-26** Create `events/technical.ts`: typed builders for technical events — `buildApiRequestEvent`, `buildApiErrorEvent`, `buildSlowApiEvent`, `buildRenderSlowEvent`
- [ ] **OBS-27** Integrate `track("task.created")` into `CreateTaskView` `onSubmit` success handler
- [ ] **OBS-28** Integrate `track("task.updated")` into `EditTaskView` submit success handler
- [ ] **OBS-29** Integrate `track("task.deleted")` into `DeleteTaskButton` mutation `onSuccess`
- [ ] **OBS-30** Integrate `track("task.status_changed")` into status transition mutation `onSuccess`
- [ ] **OBS-31** Integrate `track("comment.added")` into `AddCommentInput` mutation `onSuccess`
- [ ] **OBS-32** Integrate `track("attachment.uploaded")` into `TaskFormAttachmentsField` upload success
- [ ] **OBS-33** Integrate `track("filter.applied")` into `TaskListFilters` `setFilters` handler
- [ ] **OBS-34** Integrate `track("ai_breakdown.generated")` + `track("ai_breakdown.published")` into WorkBreakdown flow
- [ ] **OBS-35** Integrate `track("connection.connected")` / `track("connection.disconnected")` into auth flow hooks
- [ ] **OBS-36** Integrate `track("project.selected")` into `ProjectPickerSection`

### PHASE 6 — Performance tracking

- [ ] **OBS-37** Create `hooks/usePerformanceTracker.ts`: uses `PerformanceObserver` + React `useEffect` timing to detect slow renders (> 100 ms threshold); fires `render.slow` event — opt-in per component via `usePerformanceTracker("ComponentName")`
- [ ] **OBS-38** Add `usePerformanceTracker` to `TaskDetails`, `TasksList`, `WorkBreakdownPreviewView` (the heaviest components)
- [ ] **OBS-39** Add `api.slow` detection inside `withObservability` middleware when `durationMs > 3000`
- [ ] **OBS-40** Add `api.retry` detection: shared Axios/fetch client records repeated calls to same endpoint within 30 s window

### PHASE 7 — Error reporting + alert thresholds

- [ ] **OBS-41** Create `core/error-reporter.ts`: catches unhandled promise rejections + `window.onerror` client-side; fires `error.unhandled` event; server-side catches uncaught exceptions in route handlers
- [ ] **OBS-42** Update `libs/ui/src/components/ErrorBoundary.tsx` to call `ObservabilityClient.track()` with `error.react_boundary` event in `componentDidCatch`
- [ ] **OBS-43** Create `core/threshold-monitor.ts` (server-side): in-memory sliding window counter per alert type; when threshold crossed, calls configured notifiers (email via `nodemailer` or webhook POST)
- [ ] **OBS-44** Read threshold config from `libs/observability/src/config/thresholds.yaml` at startup, overridable via `ALERT_EMAIL` + `ALERT_WEBHOOK_URL` env vars
- [ ] **OBS-45** Add `auth.refresh_failed` tracking to the OAuth refresh route handler with alert threshold

### PHASE 8 — Google Analytics exporter (optional, web events)

- [ ] **OBS-46** Create `exporters/google-analytics.ts`: maps `page.viewed` and `business` category events to `gtag('event', ...)` calls; disabled unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
- [ ] **OBS-47** Inject `<Script>` gtag loader into `layout.tsx` conditionally when GA measurement ID is present

### PHASE 9 — Export wiring + platform app config

- [ ] **OBS-48** Create `libs/observability/src/createObservabilityClient.ts`: factory that reads `NEXT_PUBLIC_OBSERVABILITY_EXPORTERS` env var (comma-separated: `"vercel,otlp,ga"`) and assembles the exporter array
- [ ] **OBS-49** Initialise `ObservabilityClient` singleton in `apps/jira/src/app/Providers.tsx` using the factory; inject it into a React context (`ObservabilityContext`) so all hooks can access it without prop drilling
- [ ] **OBS-50** Add observability env vars to `apps/jira/.env.example`:
  ```
  NEXT_PUBLIC_OBSERVABILITY_EXPORTERS=vercel         # vercel | otlp | ga | console
  NEXT_PUBLIC_APP_VERSION=0.1.0                      # or inject from CI
  ALERT_EMAIL=                                       # threshold alert recipient
  ALERT_WEBHOOK_URL=                                 # optional Slack/Teams webhook
  OTEL_EXPORTER_OTLP_ENDPOINT=                       # for Grafana / Prometheus OTLP
  NEXT_PUBLIC_GA_MEASUREMENT_ID=                     # optional Google Analytics
  ```

### PHASE 10 — Vercel Dashboard & Visualization

- [ ] **OBS-51** Define custom event funnels in Vercel Analytics dashboard:
  - Funnel: `session.started` → `project.selected` → `task.viewed` → `task.created`
  - Funnel: `task.viewed` → `task.updated`
  - Funnel: `ai_breakdown.generated` → `ai_breakdown.published`
- [ ] **OBS-52** Define Vercel Analytics segments by `platform` property (jira / monday / wrike) to compare per-platform adoption
- [ ] **OBS-53** Document Vercel Log Drain setup: how to connect Vercel to Grafana Cloud / Datadog / Axiom for advanced querying (`docs/observability-backends.md`)
- [ ] **OBS-54** Create sample Grafana dashboard JSON (`tools/grafana-dashboard.json`) pre-configured with panels for: API error rate, p50/p95/p99 response times, task creation rate, active users, Web Vitals gauges

### PHASE 11 — NX project, exports, testing

- [ ] **OBS-55** Add `libs/observability/project.json` with lint + test targets
- [ ] **OBS-56** Add `libs/observability/tsconfig.json` extending `../../tsconfig.base.json`
- [ ] **OBS-57** Add `"@mp/observability"` path alias to `tsconfig.base.json` and all app `tsconfig.json` files
- [ ] **OBS-58** Write unit tests for:
  - `capability-filter.ts` — events dropped when flag is false
  - `threshold-monitor.ts` — alert fires at exactly the threshold count
  - `withObservability.ts` — records timing, status code, fires error event on 5xx
  - `createObservabilityClient.ts` — correct exporter set assembled from env
- [ ] **OBS-59** Write integration smoke test: fire a `task.created` event in test env, assert `ConsoleExporter` received it with correct shape

---

## New Dependencies

```json
// Production
"@vercel/analytics":              "^1.x",
"@vercel/speed-insights":         "^1.x",
"@vercel/otel":                   "^1.x",
"@opentelemetry/api":             "^1.x",
"@opentelemetry/sdk-node":        "^0.x",
"@opentelemetry/exporter-otlp-http": "^0.x",
"pino":                           "^9.x",
"pino-http":                      "^10.x",
"nodemailer":                     "^6.x"   // threshold alerts only (server-side)

// Dev
"pino-pretty":                    "^13.x"  // dev console formatting
```

---

## Non-Goals (out of scope for this implementation)

- Real-time streaming dashboards (beyond what Vercel provides out-of-box)
- User session replay (e.g. Hotjar, FullStory) — PII risk, separate decision
- Infrastructure metrics (CPU, memory) — Vercel manages this
- A/B testing framework — separate concern

---

## Key Design Decisions

| Decision                                                   | Rationale                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| OpenTelemetry as the trace/metric core                     | CNCF standard; works with every backend; Vercel OTel is just an exporter         |
| `@vercel/analytics` for web events                         | Native Vercel integration, zero config, dashboard ready out-of-box               |
| Pino for server logs                                       | Fastest Node.js logger; outputs structured JSON; Vercel streams it to log drains |
| `queueMicrotask` / `requestIdleCallback` for client events | Guarantees tracking never blocks the render thread                               |
| Capability-filter at dispatch time                         | Adding a new platform never requires touching event-firing code                  |
| Threshold YAML, not hardcoded                              | Ops can tune limits without a code deploy                                        |
| `sessionId` = anonymous rotating ID                        | Tracks usage patterns without storing PII; GDPR-safe                             |
