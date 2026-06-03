import type { LogLevel, LogRecord } from "../types/logger";

/**
 * Structured server-side logger.
 *
 * In production / server environments we use pino for fast JSON output.
 * In the browser (or when pino is unavailable) we fall back to a lightweight
 * implementation that writes the same JSON shape to the console.
 *
 * Usage:
 *   const log = createLogger({ platform: "jira", requestId: "abc" });
 *   log.info("Task created", { taskKey: "PROJ-123" });
 *   log.error("API call failed", {}, error);
 */

export interface LoggerContext {
  platform?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>, error?: Error): void;
  fatal(message: string, fields?: Record<string, unknown>, error?: Error): void;
  /** Create a child logger with additional default context fields. */
  child(context: Record<string, unknown>): Logger;
}

// ── Pino-backed implementation ───────────────────────────────────────────────

type PinoInstance = {
  debug(obj: object, msg: string): void;
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
  fatal(obj: object, msg: string): void;
  child(bindings: object): PinoInstance;
};

function tryRequirePino(): ((opts: object) => PinoInstance) | null {
  try {
    // Dynamic require — avoids bundling pino in browser chunks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("pino") as (opts: object) => PinoInstance;
  } catch {
    return null;
  }
}

function buildPinoLogger(context: LoggerContext): Logger {
  const pino = tryRequirePino();
  if (!pino) return buildFallbackLogger(context);

  const instance = pino({
    level: process.env.LOG_LEVEL ?? "info",
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    base: null, // omit pid/hostname
  }).child(context as object);

  const wrap =
    (level: LogLevel) => (message: string, fields?: Record<string, unknown>, error?: Error) => {
      const obj: Record<string, unknown> = { ...fields };
      if (error) {
        obj["error"] = {
          message: error.message,
          stack: error.stack,
          code: (error as NodeJS.ErrnoException).code,
        };
      }
      instance[level](obj, message);
    };

  return {
    debug: wrap("debug"),
    info: wrap("info"),
    warn: wrap("warn"),
    error: wrap("error"),
    fatal: wrap("fatal"),
    child: (ctx) => buildPinoLogger({ ...context, ...ctx }),
  };
}

// ── Fallback (browser / test / pino-not-installed) ───────────────────────────

function buildFallbackLogger(context: LoggerContext): Logger {
  const emit = (
    level: LogLevel,
    message: string,
    fields?: Record<string, unknown>,
    error?: Error,
  ) => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") return;
    const record: LogRecord = {
      level,
      message,
      timestamp: new Date().toISOString(),
      platform: context.platform,
      requestId: context.requestId,
      fields: { ...context, ...fields },
      error: error ? { message: error.message, stack: error.stack } : undefined,
    };
    const fn =
      level === "error" || level === "fatal"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    fn(JSON.stringify(record));
  };

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f, e) => emit("error", m, f, e),
    fatal: (m, f, e) => emit("fatal", m, f, e),
    child: (ctx) => buildFallbackLogger({ ...context, ...ctx }),
  };
}

// ── Public factory ───────────────────────────────────────────────────────────

const IS_SERVER = typeof window === "undefined";

export function createLogger(context: LoggerContext = {}): Logger {
  return IS_SERVER ? buildPinoLogger(context) : buildFallbackLogger(context);
}

/** Shared root logger — suitable for module-level usage. */
export const rootLogger = createLogger({ platform: "platform" });
