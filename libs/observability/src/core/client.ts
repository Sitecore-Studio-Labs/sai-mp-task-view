import type { CapabilityFlags } from "../events/capability-filter";
import { shouldTrackEvent } from "../events/capability-filter";
import type { BaseExporter } from "../exporters/base";
import type { EventCategory, EventSeverity, ObservabilityEvent } from "../types/events";
import type { LogLevel, LogRecord } from "../types/logger";

// ── Span abstraction ─────────────────────────────────────────────────────────

export interface Span {
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(code: "ok" | "error", message?: string): void;
  end(): void;
}

const NO_OP_SPAN: Span = {
  setAttribute: () => {},
  setStatus: () => {},
  end: () => {},
};

// ── Tracer abstraction ───────────────────────────────────────────────────────

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span;
}

const NO_OP_TRACER: Tracer = {
  startSpan: () => NO_OP_SPAN,
};

// ── ObservabilityClient ──────────────────────────────────────────────────────

export interface ClientInitOptions {
  exporters: BaseExporter[];
  /** Default platform name prepended to every event */
  platform: string;
  /** App version string (semver or git SHA) */
  appVersion?: string;
  /** Tracer implementation — provided by the OTel exporter in Phase 4 */
  tracer?: Tracer;
}

/**
 * Central observability client — a singleton per process / browser tab.
 *
 * Usage:
 *   ObservabilityClient.getInstance().init({ exporters: [...], platform: "jira" });
 *   ObservabilityClient.getInstance().track({ eventName: "task.created", ... });
 */
export class ObservabilityClient {
  private static instance: ObservabilityClient | null = null;

  private exporters: BaseExporter[] = [];
  private platform = "unknown";
  private appVersion = "unknown";
  private tracer: Tracer = NO_OP_TRACER;
  private initialized = false;

  /** Obtain the process-wide singleton. */
  static getInstance(): ObservabilityClient {
    if (!ObservabilityClient.instance) {
      ObservabilityClient.instance = new ObservabilityClient();
    }
    return ObservabilityClient.instance;
  }

  /** Reset the singleton — used in tests only. */
  static _reset(): void {
    ObservabilityClient.instance = null;
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  init(options: ClientInitOptions): void {
    this.exporters = options.exporters;
    this.platform = options.platform;
    this.appVersion = options.appVersion ?? "unknown";
    this.tracer = options.tracer ?? NO_OP_TRACER;

    for (const exporter of this.exporters) {
      try {
        exporter.initialize?.();
      } catch {
        // individual exporter failures must not block startup
      }
    }
    this.initialized = true;
  }

  // ── Core methods ────────────────────────────────────────────────────────────

  /**
   * Track an observability event.
   *
   * @param partial   Partial event — `platform`, `appVersion`, `timestamp`, and `sessionId`
   *                  are filled in automatically when not provided.
   * @param capabilities  Optional capability flags for the running platform.
   *                      Events with a capability guard are dropped when the flag is false.
   */
  track(
    partial: Omit<ObservabilityEvent, "platform" | "appVersion" | "timestamp" | "sessionId"> &
      Partial<Pick<ObservabilityEvent, "platform" | "appVersion" | "timestamp" | "sessionId">>,
    capabilities?: CapabilityFlags,
  ): void {
    if (!this.initialized) return;

    // Apply capability filter
    if (capabilities && !shouldTrackEvent(partial.eventName, capabilities)) return;

    const event: ObservabilityEvent = {
      platform: this.platform,
      appVersion: this.appVersion,
      timestamp: Date.now(),
      sessionId: getOrCreateSessionId(),
      ...partial,
      properties: partial.properties ?? {},
    };

    this._dispatch(event);
  }

  /** Emit a structured log record to all exporters that support logging. */
  log(level: LogLevel, message: string, fields?: Record<string, unknown>, error?: Error): void {
    if (!this.initialized) return;

    const record: LogRecord = {
      level,
      message,
      timestamp: new Date().toISOString(),
      platform: this.platform,
      fields,
      error: error
        ? {
            message: error.message,
            stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
            code: (error as NodeJS.ErrnoException).code,
          }
        : undefined,
    };

    for (const exporter of this.exporters) {
      try {
        exporter.exportLog?.(record);
      } catch {
        // silent
      }
    }
  }

  /** Start a timing span. Must call span.end() when the operation completes. */
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
    if (!this.initialized) return NO_OP_SPAN;
    return this.tracer.startSpan(name, attributes);
  }

  /** Flush all exporters that support it (useful in serverless cold-start teardown). */
  async flush(): Promise<void> {
    await Promise.allSettled(this.exporters.map((e) => e.flush?.() ?? Promise.resolve()));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Convenience wrapper: build and track an error event.
   */
  trackError(
    eventName: string,
    error: Error,
    extra?: {
      severity?: EventSeverity;
      errorCode?: string;
      platform?: string;
      properties?: Record<string, string | number | boolean>;
    },
  ): void {
    this.track({
      eventName,
      category: "error" as EventCategory,
      severity: extra?.severity ?? "error",
      errorCode: extra?.errorCode,
      errorStack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
      properties: { errorMessage: error.message, ...(extra?.properties ?? {}) },
      ...(extra?.platform ? { platform: extra.platform } : {}),
    });
  }

  private _dispatch(event: ObservabilityEvent): void {
    for (const exporter of this.exporters) {
      try {
        exporter.export(event);
      } catch {
        // Never let a broken exporter surface to user-facing code
      }
    }
  }
}

// ── Session ID ───────────────────────────────────────────────────────────────

const SESSION_KEY = "obs_session_id";

function getOrCreateSessionId(): string {
  if (typeof sessionStorage === "undefined") {
    // Server-side: no persistent session — use a per-request placeholder
    return "server";
  }
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
