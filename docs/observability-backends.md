# Observability Backends

The `@mp/observability` library uses an exporter array — swap or stack exporters without touching application code.

## Exporters

| Exporter         | Class                     | When to use                                                                |
| ---------------- | ------------------------- | -------------------------------------------------------------------------- |
| Console          | `ConsoleExporter`         | Development — colorized output in the terminal                             |
| Vercel Analytics | `VercelAnalyticsExporter` | Vercel deployments — automatic page view and event tracking                |
| OTLP (HTTP/JSON) | `OtlpExporter`            | Self-hosted or cloud backends: Grafana Tempo, Jaeger, Honeycomb, Lightstep |
| Google Analytics | `GoogleAnalyticsExporter` | Marketing / business KPI dashboards                                        |

## Wiring exporters

Exporters are passed in `createObservabilityClient()` (see `apps/jira/src/app/Providers.tsx`):

```typescript
createObservabilityClient({
  platform: "jira",
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
  exporters: [
    process.env.NODE_ENV !== "production" ? new ConsoleExporter() : null,
    new VercelAnalyticsExporter(),
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? new OtlpExporter() : null,
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
      ? new GoogleAnalyticsExporter(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
      : null,
  ].filter(Boolean),
});
```

## Vercel Analytics

No configuration needed beyond deploying to Vercel. Page views are tracked automatically by `<Analytics />` in `layout.tsx`. Custom events flow through `VercelAnalyticsExporter` via `client.track()`.

## Grafana / Prometheus

### Grafana Tempo (traces)

Set environment variables in your deployment:

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo.your-domain.com
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>
```

`OtlpExporter` will POST OTLP/JSON spans to `$ENDPOINT/v1/traces`. Import the dashboard from `tools/grafana-dashboard.json`.

### Prometheus (metrics)

Prometheus scrapes a `/metrics` endpoint. To expose one, create a Next.js API route that reads from a `PrometheusExporter` — see the [prom-client](https://github.com/siimon/prom-client) integration guide.

## Jaeger

Use the same `OtlpExporter` — Jaeger accepts OTLP/HTTP since v1.35:

```
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Honeycomb

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<api-key>,x-honeycomb-dataset=jira-task-view
```

## Google Analytics 4

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`. The `GoogleAnalyticsExporter` injects the gtag script once and maps every `ObservabilityEvent` to a GA4 custom event.

## Adding a new backend

1. Create `libs/observability/src/exporters/my-backend.ts` implementing `BaseExporter`
2. Export from `libs/observability/src/index.ts`
3. Add to the exporter array in `Providers.tsx` behind an env-var guard
4. No other code changes required
