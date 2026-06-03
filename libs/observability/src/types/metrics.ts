/**
 * Named metric / event constants used throughout the codebase.
 * Import these instead of inlining strings to get rename-refactoring for free.
 */

export const METRIC = {
  // ── Page ──────────────────────────────────────────────────────────────────
  PAGE_VIEWED: "page.viewed",

  // ── Session identity (Group 1) ────────────────────────────────────────────
  SESSION_STARTED: "session.started",
  SESSION_ENDED: "session.ended",
  SESSION_HEARTBEAT: "session.heartbeat",
  USER_ROLE_SIGNAL: "user.role_signal",

  // ── Adoption funnel (Group 2) ─────────────────────────────────────────────
  APP_FIRST_OPENED: "app.first_opened",
  APP_CONNECTION_COMPLETED: "app.connection_completed",
  APP_FIRST_TASK_ACTIONED: "app.first_task_actioned",
  APP_ONBOARDING_COMPLETED: "app.onboarding_completed",

  // ── View engagement (Group 3) ─────────────────────────────────────────────
  VIEW_ENTERED: "view.entered",
  VIEW_EXITED: "view.exited",
  VIEW_REVISITED: "view.revisited",

  // ── Feature adoption & stickiness (Group 4) ───────────────────────────────
  FEATURE_FIRST_USED: "feature.first_used",
  FEATURE_USED: "feature.used",
  FEATURE_ABANDONED: "feature.abandoned",
  FEATURE_REUSED_ACROSS_SESSIONS: "feature.reused_across_sessions",

  // ── Productivity / AI ROI (Group 5) ───────────────────────────────────────
  PRODUCTIVITY_TASK_ACTIONED: "productivity.task_actioned",
  PRODUCTIVITY_WORKFLOW_COMPLETED: "productivity.workflow_completed",
  AI_BREAKDOWN_GENERATED: "ai_breakdown.generated",
  AI_BREAKDOWN_PUBLISHED: "ai_breakdown.published",
  AI_ACCEPTANCE_RATE_SIGNAL: "ai.acceptance_rate_signal",
  COLLABORATION_SIGNAL: "collaboration.signal",

  // ── Platform growth & popularity (Group 6) ────────────────────────────────
  APP_DAILY_ACTIVE: "app.daily_active",
  APP_PLATFORM_COVERAGE: "app.platform_coverage",
  PLATFORM_POPULARITY_SIGNAL: "platform.popularity_signal",

  // ── Retention health (Group 7) ────────────────────────────────────────────
  APP_RETURNED_AFTER_GAP: "app.returned_after_gap",
  APP_CHURNED_SIGNAL: "app.churned_signal",
  RETENTION_WEEKLY_ACTIVE: "retention.weekly_active",
  RETENTION_STREAK: "retention.streak",
  CONNECTION_HEALTH_SIGNAL: "connection.health_signal",
  ERROR_USER_VISIBLE: "error.user_visible",

  // ── Connection (kept for auth flow hooks) ─────────────────────────────────
  CONNECTION_CONNECTED: "connection.connected",
  CONNECTION_DISCONNECTED: "connection.disconnected",

  // ── Technical / API events ────────────────────────────────────────────────
  API_REQUEST: "api.request",
  API_ERROR: "api.error",
  API_SLOW: "api.slow",
  API_RETRY: "api.retry",

  // ── Web Vitals ────────────────────────────────────────────────────────────
  WEB_VITALS_LCP: "web_vitals.lcp",
  WEB_VITALS_CLS: "web_vitals.cls",
  WEB_VITALS_INP: "web_vitals.inp",
  WEB_VITALS_TTFB: "web_vitals.ttfb",

  // ── Errors ────────────────────────────────────────────────────────────────
  ERROR_UNHANDLED: "error.unhandled",
  ERROR_REACT_BOUNDARY: "error.react_boundary",
  ERROR_BOUNDARY_TRIGGERED: "error.boundary_triggered",

  // ── Performance ───────────────────────────────────────────────────────────
  RENDER_SLOW: "render.slow",

  // ── Auth ──────────────────────────────────────────────────────────────────
  AUTH_TOKEN_REFRESHED: "auth.token_refreshed",
  AUTH_TOKEN_EXPIRED: "auth.token_expired",
  AUTH_REFRESH_FAILED: "auth.refresh_failed",

  // ── Alerts ────────────────────────────────────────────────────────────────
  ALERT_THRESHOLD_EXCEEDED: "alert.threshold_exceeded",
} as const;

export type MetricName = (typeof METRIC)[keyof typeof METRIC];
