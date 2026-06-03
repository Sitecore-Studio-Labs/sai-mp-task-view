/**
 * Canonical, vendor-neutral observability event schema.
 * Every exporter (Vercel, OTLP, GA, console) receives this shape unchanged.
 */

export type EventCategory = "page" | "user_action" | "api" | "error" | "performance" | "business";

export type EventSeverity = "info" | "warn" | "error" | "critical";

export interface ObservabilityEvent {
  // ── Identity ────────────────────────────────────────────────────────────────
  /** Dot-namespaced event name: "task.created", "api.issues.list", "error.unhandled" */
  eventName: string;
  category: EventCategory;
  /** Machine-readable platform key from PlatformCapabilities.platformName */
  platform: string;
  /** NEXT_PUBLIC_APP_VERSION env var, or "unknown" */
  appVersion: string;

  // ── Timing ──────────────────────────────────────────────────────────────────
  timestamp: number;
  /** Wall-clock duration in milliseconds — present on api and performance events */
  duration?: number;

  // ── Session ─────────────────────────────────────────────────────────────────
  /** Anonymous rotating ID stored in sessionStorage — no PII */
  sessionId: string;
  /** SHA-256 of the platform accountId — never the raw value */
  userId?: string;

  // ── Payload ─────────────────────────────────────────────────────────────────
  /** Flat key-value bag of event-specific dimensions */
  properties: Record<string, string | number | boolean>;

  // ── Error ───────────────────────────────────────────────────────────────────
  severity?: EventSeverity;
  errorCode?: string;
  /** Stack trace — included server-side and in dev mode only */
  errorStack?: string;
}
