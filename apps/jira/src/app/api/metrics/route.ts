import { PrometheusExporter } from "@mp/observability";

/**
 * GET /api/metrics — Prometheus text exposition endpoint.
 *
 * Exposes in-process event counters and API duration histograms in the
 * standard Prometheus text format (version 0.0.4).
 *
 * Scraping setup:
 *   Grafana Agent / Alloy: point at https://your-app.vercel.app/api/metrics
 *   Prometheus:            add a scrape_config target for this URL
 *   Grafana Cloud:         use the Grafana Agent integration
 *
 * Note: counters reset on each serverless cold start.
 * For durable cross-process metrics, use the OTLP exporter to push to
 * Grafana Mimir or a persistent OTLP backend.
 *
 * This route is intentionally unauthenticated (Prometheus scrape targets
 * do not send auth by default). Add IP allowlist at the CDN/load-balancer
 * layer if the metrics need to be private.
 */
export async function GET(): Promise<Response> {
  const body = PrometheusExporter.getInstance().render();
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      // No-cache: scrapers always want fresh data
      "Cache-Control": "no-store",
    },
  });
}
