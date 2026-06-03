export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogRecord {
  level: LogLevel;
  message: string;
  /** ISO timestamp — set by the logger if not provided */
  timestamp?: string;
  /** Identifies which platform app emitted this log */
  platform?: string;
  /** Trace/request correlation ID */
  requestId?: string;
  /** Any additional structured fields */
  fields?: Record<string, unknown>;
  /** Error object — serialised as { message, stack } */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}
