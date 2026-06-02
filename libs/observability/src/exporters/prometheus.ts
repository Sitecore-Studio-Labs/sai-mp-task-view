import type { ObservabilityEvent } from "../types/events";
import type { BaseExporter } from "./base";

/**
 * In-process Prometheus metrics exporter.
 *
 * Maintains counters and histograms in memory and exposes them in
 * Prometheus text format via PrometheusExporter.render().
 *
 * Wire up a GET /api/metrics route to expose these to a Prometheus scraper:
 *
 *   // apps/jira/src/app/api/metrics/route.ts
 *   import { PrometheusExporter } from "@mp/observability";
 *   export async function GET() {
 *     const body = PrometheusExporter.getInstance().render();
 *     return new Response(body, {
 *       headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
 *     });
 *   }
 *
 * Grafana setup: add a Prometheus data source pointing at /api/metrics,
 * or use the Grafana Agent / Alloy to scrape and forward to Grafana Cloud.
 *
 * Note: counters are in-process only — they reset on server restart.
 * For durable metrics use the OTLP exporter to push to Grafana Tempo/Mimir.
 */
export class PrometheusExporter implements BaseExporter {
  readonly name = "prometheus";

  private static instance: PrometheusExporter | null = null;

  // counter: eventName → { labels map → count }
  private readonly counters = new Map<string, Map<string, number>>();
  // histogram: eventName → list of observed values (for api.request duration)
  private readonly histograms = new Map<string, number[]>();

  static getInstance(): PrometheusExporter {
    if (!PrometheusExporter.instance) {
      PrometheusExporter.instance = new PrometheusExporter();
    }
    return PrometheusExporter.instance;
  }

  static _reset(): void {
    PrometheusExporter.instance = null;
  }

  export(event: ObservabilityEvent): void {
    const labelStr = this.buildLabelString(event);
    this.inc(`mp_event_total`, labelStr);

    // Track API duration as a histogram when duration is present
    if (event.category === "api" && event.duration !== undefined) {
      const histKey = `mp_api_duration_ms`;
      if (!this.histograms.has(histKey)) this.histograms.set(histKey, []);
      this.histograms.get(histKey)!.push(event.duration);
    }

    // Track error count separately for alerting
    if (event.category === "error") {
      this.inc(`mp_error_total`, labelStr);
    }
  }

  /** Render all collected metrics in Prometheus text exposition format. */
  render(): string {
    const lines: string[] = [];

    // ── Counters ─────────────────────────────────────────────────────────────
    for (const [metric, labelMap] of this.counters.entries()) {
      lines.push(`# HELP ${metric} Total count of observability events by type`);
      lines.push(`# TYPE ${metric} counter`);
      for (const [labels, count] of labelMap.entries()) {
        lines.push(`${metric}{${labels}} ${count}`);
      }
    }

    // ── Histograms ────────────────────────────────────────────────────────────
    for (const [metric, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      const buckets = [10, 50, 100, 250, 500, 1000, 2500, 5000, Infinity];

      lines.push(`# HELP ${metric} API request duration in milliseconds`);
      lines.push(`# TYPE ${metric} histogram`);
      for (const le of buckets) {
        const c = sorted.filter((v) => v <= le).length;
        const leLabel = le === Infinity ? "+Inf" : String(le);
        lines.push(`${metric}_bucket{le="${leLabel}"} ${c}`);
      }
      lines.push(`${metric}_sum ${sum}`);
      lines.push(`${metric}_count ${count}`);
    }

    return lines.join("\n") + "\n";
  }

  private inc(metric: string, labelStr: string): void {
    if (!this.counters.has(metric)) this.counters.set(metric, new Map());
    const labelMap = this.counters.get(metric)!;
    labelMap.set(labelStr, (labelMap.get(labelStr) ?? 0) + 1);
  }

  private buildLabelString(event: ObservabilityEvent): string {
    const labels: Record<string, string> = {
      event: sanitizeLabel(event.eventName),
      platform: sanitizeLabel(event.platform),
      category: event.category,
    };
    if (event.severity) labels["severity"] = event.severity;
    return Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
  }
}

function sanitizeLabel(s: string): string {
  // Prometheus label values must not contain double quotes or newlines
  return s.replace(/["\n\\]/g, "_");
}
