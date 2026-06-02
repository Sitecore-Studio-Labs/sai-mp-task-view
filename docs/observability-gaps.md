# Observability — Gap Analysis & Fix Plan

> Generated during production-readiness review.
> Status: gaps fixed inline — this file is the audit trail.

---

## Architecture summary (current)

```
Browser                         Server (Next.js API routes)
─────────────────────────────   ───────────────────────────────────────
Providers.tsx (useEffect)        instrumentation.ts (server startup)
  └─ createObservabilityClient     └─ registerOTel(@vercel/otel)  ← SEPARATE from ObservabilityClient
       ├─ VercelAnalyticsExporter
       ├─ GoogleAnalyticsExporter  platformRoute.ts / withObservability
       └─ ConsoleExporter            └─ ObservabilityClient.getInstance().track()
                                          └─ NOT INITIALIZED → silently dropped ✗
```

---

## Gap 1 — CRITICAL: Server-side ObservabilityClient never initialized

**Root cause:**
`createObservabilityClient()` is called inside `useEffect` in `Providers.tsx`, which only runs in the browser. Every server-side `track()` call in `platformRoute.ts` and `withObservability.ts` reaches an uninitialized singleton and returns early due to `if (!this.initialized) return`.

This means **all** of the following are silently dropped:

- `api.request` events
- `api.error` events
- `api.slow` events
- Any server-side error tracking

**Fix:** Initialize the server-side `ObservabilityClient` in `instrumentation.ts` with the OTLP exporter when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

---

## Gap 2 — HIGH: Vercel Analytics custom events section is empty

**Two causes:**

**Cause A — Vercel project settings not toggled:**
Having `@vercel/analytics` installed and `<Analytics />` in layout is not enough. You must go to:

> Vercel Dashboard → your project → **Analytics** tab → **Enable Web Analytics**

Until that toggle is on, `track()` calls are no-ops regardless of code.

**Cause B — Almost no business events are actually called:**
The only event actively tracked in the Jira app is `page.viewed` from `usePageTracking("task-manager-extension")`.
The `session.started`, `view.entered`, and all lifecycle events in `business.ts` exist but are never called.
Vercel's Custom Events section only shows events that have actually been fired.

**Fix:** Wire `session.started` in `Providers.tsx` and `view.entered`/`view.exited` in the task manager extension page.

---

## Gap 3 — HIGH: OTLP exporter sends business metrics as traces

**Root cause:**
`OtlpExporter.export()` posts to `/v1/traces` and wraps every event in a synthetic span.
Business events (feature.used, session.started, etc.) are **not traces** — they are **log records** or **metrics**.
Grafana Tempo (traces backend) will show these but they won't integrate with Prometheus alerting rules.

**Industry standard (OpenTelemetry signals):**
| Signal | Endpoint | What to send |
|--------|----------|--------------|
| Traces | `/v1/traces` | Distributed request spans (`startSpan` / `span.end`) |
| Logs | `/v1/logs` | Business events, errors, structured log records |
| Metrics| `/v1/metrics`| Counters, gauges, histograms (Prometheus-compatible) |

**Fix:** Route events to `/v1/logs` (OTLP Logs format) and actual tracer spans to `/v1/traces`.

---

## Gap 4 — MEDIUM: OTLP exporter never actually activates

**Root cause:**
`buildDefaultExporters()` guards OTLP with `typeof window === "undefined"`.
But `buildDefaultExporters()` is called from `useEffect` in `Providers.tsx`, which runs **in the browser** — so `typeof window === "undefined"` is always `false`.
The OTLP exporter is never added on the client path.

The OTLP exporter is meant for server-side use. Fix: Initialize it in `instrumentation.ts` server-side.

---

## Gap 5 — MEDIUM: No Prometheus metrics endpoint

For Grafana dashboards using Prometheus scraping, you need:

1. A `PrometheusExporter` that maintains in-memory counters
2. A `GET /api/metrics` route that serves Prometheus text format

Without this, Grafana can only receive data via OTLP push (Tempo), not via Prometheus pull.

**Fix:** Add `PrometheusExporter` + `GET /api/metrics` route.

---

## Gap 6 — MEDIUM: Web Vitals (LCP, CLS, INP, TTFB) defined but never collected

`METRIC.WEB_VITALS_LCP` etc. exist in `metrics.ts` but no code actually collects these from the browser.
The `web-vitals` package (already a transitive dependency via Next.js) has the collection API.

**Fix:** Add `useWebVitals()` hook using `onLCP`, `onCLS`, `onINP`, `onTTFB` from `web-vitals`.

---

## Gap 7 — LOW: No event sampling

Every event is tracked 100%. For high-traffic production use, this creates unnecessary load on analytics backends.

**Industry standard:** Configure a `sampleRate` (0.0–1.0) to drop events probabilistically. The Vercel Analytics `track()` has its own quota, and OTLP backends can become expensive at scale.

**Fix:** Add `sampleRate` to `ObservabilityConfig` with default 1.0.

---

## Gap 8 — LOW: Fire-and-forget fetch may drop events on page navigation

`OtlpExporter.export()` uses `fetch().catch()` which can be cancelled by the browser when navigating away.

**Fix:** Use `navigator.sendBeacon()` as fallback for end-of-session events + call `client.flush()` in a `visibilitychange` listener.

---

## Performance overhead — not a current concern

**Question: will adding more backends cause overhead?**

Current approach: each `track()` call iterates all exporters synchronously, but each exporter's internal work is async (`fetch().catch()` for OTLP, `gtag()` for GA). The try/catch ensures failures don't propagate.

At the current traffic scale, adding 3–4 exporters adds ~microseconds of sync overhead per event. Not a concern.

If traffic grows to thousands of events/second: add an async circular buffer that batches sends. Not needed now.

---

## Configuration — how to enable each backend

| Backend                          | What to set                                               | Where            |
| -------------------------------- | --------------------------------------------------------- | ---------------- |
| Vercel Analytics (custom events) | Enable in Vercel Dashboard → Analytics                    | Project settings |
| Console (dev)                    | Always on in `NODE_ENV=development`                       | Auto             |
| Console (prod)                   | `NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING=true`                 | `.env.local`     |
| Google Analytics                 | `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXX`                   | `.env.local`     |
| OTLP / Grafana / Honeycomb       | `OTEL_EXPORTER_OTLP_ENDPOINT=https://...`                 | Server env       |
| OTLP auth                        | `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>` | Server env       |
| Prometheus scraping              | Built-in at `GET /api/metrics` (after Gap 5 fix)          | No config needed |

All backends except Vercel Analytics are **opt-in via env vars**. An unset env var = that backend is skipped. Zero overhead for unconfigured backends.

---

## Status after fixes

| Gap                                  | Severity | Fixed            |
| ------------------------------------ | -------- | ---------------- |
| Server-side client never initialized | CRITICAL | ✅               |
| Vercel custom events empty           | HIGH     | ✅ (code + docs) |
| OTLP sends events as traces          | HIGH     | ✅               |
| OTLP never activates client-side     | MEDIUM   | ✅               |
| No Prometheus endpoint               | MEDIUM   | ✅               |
| Web Vitals not collected             | MEDIUM   | ✅               |
| No sampling                          | LOW      | ✅               |
| sendBeacon for unload                | LOW      | ✅               |
