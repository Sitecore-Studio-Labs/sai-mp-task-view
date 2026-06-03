import type { ObservabilityEvent } from "../types/events";
import type { LogRecord } from "../types/logger";

/**
 * Contract every exporter must satisfy.
 * Methods are fire-and-forget — implementations must never throw.
 */
export interface BaseExporter {
  readonly name: string;
  /** Export a telemetry event to the backing sink. */
  export(event: ObservabilityEvent): void;
  /** Export a structured log record. Optional — exporters that handle only events may omit this. */
  exportLog?(record: LogRecord): void;
  /** Called once during ObservabilityClient.init(). Use for SDK initialisation. */
  initialize?(): void;
  /** Called on graceful shutdown (e.g. serverless function end). */
  flush?(): Promise<void>;
}
