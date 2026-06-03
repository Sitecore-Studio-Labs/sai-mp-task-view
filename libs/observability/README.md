# @mp/observability

Vendor-neutral, capability-aware telemetry library for the MP platform monorepo. Zero React dependency at the core; React hooks live in a separate layer.

---

## Architecture

```
createObservabilityClient()   ← call once at app boot (Providers.tsx)
        │
        ▼
ObservabilityClient (singleton)
        │  applies capability filter
        │  auto-fills platform / appVersion / sessionId / timestamp
        ▼
[BaseExporter[]]
  ├── VercelAnalyticsExporter  → Vercel Dashboard (Custom Events)
  ├── OtlpExporter             → Grafana / Jaeger / Honeycomb (server-side)
  ├── GoogleAnalyticsExporter  → GA4 (optional)
  └── ConsoleExporter          → dev terminal only
```

---

## Quick start

### 1. Initialise once at app boot

```typescript
// apps/jira/src/app/Providers.tsx
import { createObservabilityClient } from "@mp/observability";

useEffect(() => {
  createObservabilityClient({
    platform: "jira",
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
  });
}, []);
```

### 2. Track events in components

```typescript
import { useTracking } from "@mp/ui"; // thin wrapper over useEventTracker

const { business } = useTracking();

// feature adoption
business.featureUsed({ featureKey: "ai-breakdown", platform: platformName });

// session lifecycle
business.sessionStarted({ platform: platformName, appVersion });

// AI ROI
business.aiBreakdownPublished({ subtaskCount: 8 });
// ↳ automatically computes estimatedTimeSavedMin = 8 × AI_TIME_SAVED_PER_SUBTASK_MIN (default 7 min)
```

### 3. Track technical events (API routes)

`withAdapter` / `withAdapterRaw` in `apps/jira/src/lib/platformRoute.ts` already instruments every API route — `api.request`, `api.error`, and `api.slow` fire automatically.

---

## Business events reference

Events are organised into 7 groups. All are fired via `createBusinessEvents()`, accessed through the `useTracking()` hook in `@mp/ui`.

### Group 1 — Session identity

| Method             | Event name          | Key properties                                         |
| ------------------ | ------------------- | ------------------------------------------------------ |
| `sessionStarted`   | `session.started`   | `platform`, `appVersion`, `userRole?`                  |
| `sessionEnded`     | `session.ended`     | `durationMs`, `actionCount`, `platform`                |
| `sessionHeartbeat` | `session.heartbeat` | `platform`, `activeMs` — client-side only, every 5 min |
| `userRoleSignal`   | `user.role_signal`  | `role`, `platform` — one-shot per session              |

### Group 2 — Adoption funnel

| Method                   | Event name                 | Key properties                 |
| ------------------------ | -------------------------- | ------------------------------ |
| `appFirstOpened`         | `app.first_opened`         | `platform`, `appVersion`       |
| `appConnectionCompleted` | `app.connection_completed` | `platform`, `connectionMethod` |
| `appFirstTaskActioned`   | `app.first_task_actioned`  | `platform`, `actionType`       |
| `appOnboardingCompleted` | `app.onboarding_completed` | `platform`, `stepsCompleted`   |

### Group 3 — View engagement

| Method          | Event name       | Key properties                       |
| --------------- | ---------------- | ------------------------------------ |
| `viewEntered`   | `view.entered`   | `viewName`, `platform`, `referrer?`  |
| `viewExited`    | `view.exited`    | `viewName`, `durationMs`, `platform` |
| `viewRevisited` | `view.revisited` | `viewName`, `visitCountThisSession`  |

Valid `viewName` values: `task-list`, `task-detail`, `create-task`, `edit-task`, `work-breakdown`, `connection-setup`, `settings`.

### Group 4 — Feature adoption & stickiness

| Method                        | Event name                       | Key properties                            |
| ----------------------------- | -------------------------------- | ----------------------------------------- |
| `featureFirstUsed`            | `feature.first_used`             | `featureKey`, `platform`                  |
| `featureUsed`                 | `feature.used`                   | `featureKey`, `platform`, `sessionCount?` |
| `featureAbandoned`            | `feature.abandoned`              | `featureKey`, `abandonStage`              |
| `featureReusedAcrossSessions` | `feature.reused_across_sessions` | `featureKey`, `daysSinceFirstUse`         |

Valid `featureKey` values: `ai-breakdown`, `comments`, `attachments`, `status-transitions`, `filters`, `site-picker`, `project-picker`, `create-task`, `edit-task`.

### Group 5 — Productivity / AI ROI

| Method                          | Event name                        | Key properties                                       |
| ------------------------------- | --------------------------------- | ---------------------------------------------------- |
| `productivityTaskActioned`      | `productivity.task_actioned`      | `actionType`, `platform`, `durationMs`               |
| `productivityWorkflowCompleted` | `productivity.workflow_completed` | `workflowName`, `stepCount`, `totalDurationMs`       |
| `aiBreakdownGenerated`          | `ai_breakdown.generated`          | `subtaskCount`, `durationMs`                         |
| `aiBreakdownPublished`          | `ai_breakdown.published`          | `subtaskCount`, `estimatedTimeSavedMin`              |
| `aiAcceptanceRateSignal`        | `ai.acceptance_rate_signal`       | `generatedCount`, `publishedCount`, `acceptanceRate` |
| `collaborationSignal`           | `collaboration.signal`            | `signalType`, `platform`                             |

`estimatedTimeSavedMin` is computed as `subtaskCount × AI_TIME_SAVED_PER_SUBTASK_MIN`.
Default is **7 minutes** per subtask. Override via `NEXT_PUBLIC_AI_TIME_SAVED_PER_SUBTASK_MIN`.

### Group 6 — Platform growth & popularity

| Method                     | Event name                   | Key properties                       |
| -------------------------- | ---------------------------- | ------------------------------------ |
| `appDailyActive`           | `app.daily_active`           | `platform`, `date`                   |
| `appPlatformCoverage`      | `app.platform_coverage`      | `platform`, `connectedSiteCount`     |
| `platformPopularitySignal` | `platform.popularity_signal` | `platform`, `rank`, `totalPlatforms` |

### Group 7 — Retention health

| Method                   | Event name                 | Key properties                                                |
| ------------------------ | -------------------------- | ------------------------------------------------------------- |
| `appReturnedAfterGap`    | `app.returned_after_gap`   | `platform`, `daysSinceLastSession`                            |
| `appChurnedSignal`       | `app.churned_signal`       | `platform`, `daysSinceLastSession` — fires when gap ≥ 14 days |
| `retentionWeeklyActive`  | `retention.weekly_active`  | `platform`, `weekNumber`                                      |
| `retentionStreak`        | `retention.streak`         | `platform`, `streakDays`                                      |
| `connectionHealthSignal` | `connection.health_signal` | `platform`, `status`                                          |
| `errorUserVisible`       | `error.user_visible`       | `errorType`, `platform`, `viewName`                           |

---

## Technical events reference

Fired by `createTechnicalEvents()` — accessed via `useTracking().technical`.

| Method                   | Event name                 | Category      |
| ------------------------ | -------------------------- | ------------- |
| `connectionEstablished`  | `connection.connected`     | `user_action` |
| `connectionRevoked`      | `connection.disconnected`  | `user_action` |
| `authRefreshFailed`      | `auth.refresh_failed`      | `error`       |
| `authTokenExpired`       | `auth.token_expired`       | `error`       |
| `errorBoundaryTriggered` | `error.boundary_triggered` | `error`       |

API events (`api.request`, `api.error`, `api.slow`) are fired automatically by the `platformRoute.ts` wrappers — no manual calls needed.

---

## Capability filtering

Events guarded by a capability flag are silently dropped when that flag is `false` for the running platform. The guard table is in `libs/observability/src/events/capability-filter.ts`.

```typescript
// Monday.com (hasComments = false) → comment events dropped automatically
// Jira (hasComments = true) → comment events flow through
```

---

## Viewing metrics

| Dashboard        | Path                                  | What to look for                                                    |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Vercel Analytics | Project → Analytics → Custom Events   | All business events by name; break down by `featureKey`, `platform` |
| Vercel Funnels   | Project → Analytics → Funnels         | Onboarding conversion, AI adoption, session depth                   |
| Grafana          | Import `tools/grafana-dashboard.json` | API error rate, p95 latency, slow renders                           |
| GA4              | Explore → Funnel exploration          | Same funnels with broader audience segmentation                     |

See [docs/observability-backends.md](../../docs/observability-backends.md) for full backend setup.

---

## Threshold alerts

`ThresholdMonitor` fires `METRIC.ALERT_THRESHOLD_EXCEEDED` when sliding-window limits are crossed:

```typescript
import { ThresholdMonitor } from "@mp/observability";

ThresholdMonitor.getInstance().configure({
  maxErrors: 10, // per 60 s window
  maxApiErrorRate: 0.1, // 10% of requests
  maxSlowApiCount: 5, // slow responses per window
  windowMs: 60_000,
});
```

Configure `ALERT_EMAIL` and `ALERT_WEBHOOK_URL` env vars to receive notifications.

---

## Error reporting

```typescript
import { reportError, reportBoundaryError } from "@mp/observability";

// unhandled promise rejections, API failures
reportError(err, { severity: "error", platform: "jira" });

// React ErrorBoundary — already wired in libs/ui ErrorBoundary.tsx
reportBoundaryError(error, componentStack);
```
