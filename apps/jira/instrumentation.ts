/**
 * Next.js instrumentation hook — runs once per server startup.
 *
 * Two things happen here:
 *
 * 1. Vercel OTel is registered so distributed traces appear in the Vercel dashboard.
 *
 * 2. The ObservabilityClient singleton is initialised server-side so that API route
 *    tracking (api.request / api.error / api.slow) is not silently dropped.
 *    Without this, every ObservabilityClient.getInstance().track() call in
 *    platformRoute.ts exits immediately because `!this.initialized` is true.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ── 1. Vercel OpenTelemetry (distributed traces) ──────────────────────────
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "jira-task-view" });

    // ── 2. ObservabilityClient server-side initialisation ─────────────────────
    // Dynamically import so this module is never bundled into client chunks.
    const { createObservabilityClient } = await import("@mp/observability");
    createObservabilityClient({
      platform: "jira",
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
      // Server-side exporters are assembled from env vars automatically.
      // - OTLP is active when OTEL_EXPORTER_OTLP_ENDPOINT is set (Grafana / Honeycomb)
      // - Console is active in development (NODE_ENV !== "production")
      // Browser-only exporters (Vercel Analytics, GA) are excluded automatically
      // because this code runs in Node.js where typeof window === "undefined".
    });
  }
}
