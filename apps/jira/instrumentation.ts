/**
 * Next.js instrumentation hook — runs once per server startup.
 * Wires up Vercel's OpenTelemetry SDK so traces appear in the Vercel dashboard.
 * Only active when deployed to Vercel (OTEL_EXPORTER_OTLP_ENDPOINT is set by the platform).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "jira-task-view" });
  }
}
