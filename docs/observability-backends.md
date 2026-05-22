# Observability Backends

The `@mp/observability` library routes every event through an exporter array. Swap or stack exporters without touching application code.

---

## Where to find your business metrics

### Vercel Analytics — primary dashboard

Navigate to **vercel.com → your project → Analytics** (top navigation tab).

| Section       | What you will find                                                                           |
| ------------- | -------------------------------------------------------------------------------------------- |
| Overview      | Unique visitors, page views, top pages — auto-populated from `<Analytics />` in `layout.tsx` |
| Custom Events | Every event fired by `createBusinessEvents()` grouped by `eventName`                         |
| Audiences     | Break down any event by a property dimension (`platform`, `featureKey`, etc.)                |
| Funnels       | Chain events to measure conversion — see setup below                                         |

#### Navigating to Custom Events

1. Open the **Analytics** tab
2. Select **Custom Events** from the left sidebar
3. Pick an event name from the list — the chart shows volume over time
4. Use the **Breakdown** selector to pivot by any property (`featureKey`, `platform`, `viewName`, etc.)

#### Finding specific business event groups

| Business question            | Event name                  | Key property to break down by           |
| ---------------------------- | --------------------------- | --------------------------------------- |
| Who is using the app?        | `session.started`           | `platform`, `userRole`                  |
| How long are sessions?       | `session.ended`             | `durationMs`, `actionCount`             |
| Active vs idle time          | `session.heartbeat`         | `activeMs`                              |
| Which features are used?     | `feature.used`              | `featureKey`, `platform`                |
| First-time feature discovery | `feature.first_used`        | `featureKey`                            |
| Where do users drop off?     | `feature.abandoned`         | `featureKey`, `abandonStage`            |
| Which views are popular?     | `view.entered`              | `viewName`, `platform`                  |
| Time spent per view          | `view.exited`               | `viewName`, `durationMs`                |
| Is AI saving time?           | `ai_breakdown.published`    | `subtaskCount`, `estimatedTimeSavedMin` |
| AI subtask acceptance rate   | `ai.acceptance_rate_signal` | `acceptanceRate`                        |
| Platform growth comparison   | `app.daily_active`          | `platform`, `date`                      |
| Early churn warning          | `app.churned_signal`        | `platform`, `daysSinceLastSession`      |
| Weekly retention             | `retention.weekly_active`   | `platform`, `weekNumber`                |

#### Setting up funnels

Go to **Analytics → Funnels → New Funnel**. Recommended funnels:

#### Onboarding funnel

1. `app.first_opened`
2. `app.connection_completed`
3. `app.first_task_actioned`
4. `app.onboarding_completed`

#### AI feature engagement funnel

1. `feature.first_used` (filter: `featureKey = "ai-breakdown"`)
2. `ai_breakdown.generated`
3. `ai_breakdown.published`

#### Session depth funnel

1. `session.started`
2. `view.entered` (filter: `viewName = "task-detail"`)
3. `feature.used` (any feature)

---

## Exporters

| Exporter           | Class                     | Active when                                                              |
| ------------------ | ------------------------- | ------------------------------------------------------------------------ |
| Console            | `ConsoleExporter`         | `NODE_ENV !== "production"` or `NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING=true` |
| Vercel Analytics   | `VercelAnalyticsExporter` | Always (no-ops when `@vercel/analytics` is absent)                       |
| Google Analytics 4 | `GoogleAnalyticsExporter` | `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set                                   |
| OTLP (HTTP/JSON)   | `OtlpExporter`            | Server-side only, when `OTEL_EXPORTER_OTLP_ENDPOINT` is set              |

Exporters are auto-assembled in `createObservabilityClient()` based on the env vars above. Override the full set by passing `exporters: [...]` explicitly (see `apps/jira/src/app/Providers.tsx`).

---

## Environment variables

```bash
# Required for production
NEXT_PUBLIC_APP_VERSION=0.1.0           # injected from CI (git SHA or semver tag)

# Vercel — no env var needed; enable Analytics in the Vercel project dashboard

# Google Analytics 4 (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# OTLP — Grafana / Prometheus / Jaeger / Honeycomb (server-side only)
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo.your-domain.com
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>

# Alert thresholds (server-side)
ALERT_EMAIL=oncall@your-org.com
ALERT_WEBHOOK_URL=https://hooks.slack.com/...

# Debug
NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING=true   # force console exporter in production

# AI productivity metric — minutes assumed saved per AI-generated subtask (default: 7)
NEXT_PUBLIC_AI_TIME_SAVED_PER_SUBTASK_MIN=7
```

---

## Grafana / Prometheus

### Grafana Tempo (traces)

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo.your-domain.com
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>
```

`OtlpExporter` POSTs OTLP/JSON spans to `$ENDPOINT/v1/traces`. Import the pre-built dashboard from `tools/grafana-dashboard.json`.

### Prometheus (metrics)

Prometheus scrapes a `/metrics` endpoint. Expose one via a Next.js API route reading from a `PrometheusExporter` — see the [prom-client](https://github.com/siimon/prom-client) integration guide.

---

## Jaeger

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Jaeger accepts OTLP/HTTP since v1.35.

---

## Honeycomb

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<api-key>,x-honeycomb-dataset=jira-task-view
```

---

## Google Analytics 4

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`. Every `ObservabilityEvent` is forwarded to GA4 as a custom event. Use **GA4 → Explore → Funnel exploration** to replicate the Vercel funnels above with richer segmentation.

---

## Adding a new backend

1. Create `libs/observability/src/exporters/my-backend.ts` implementing `BaseExporter`
2. Export from `libs/observability/src/index.ts`
3. Add to the exporter array in `createObservabilityClient.ts` behind an env-var guard
4. No other code changes required — all existing `track()` calls flow through automatically
