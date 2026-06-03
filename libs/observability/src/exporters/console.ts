import type { ObservabilityEvent } from "../types/events";
import type { LogRecord } from "../types/logger";
import type { BaseExporter } from "./base";

const LEVEL_COLORS: Record<string, string> = {
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  fatal: "\x1b[35m",
};
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

/**
 * Development-only exporter. Prints structured, colourised output to stdout.
 * Automatically no-ops when NODE_ENV === "production".
 */
export class ConsoleExporter implements BaseExporter {
  readonly name = "console";

  private readonly isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV !== "production";
  }

  export(event: ObservabilityEvent): void {
    if (!this.isDev) return;
    const color = this._categoryColor(event.category);
    const ts = new Date(event.timestamp).toISOString().slice(11, 23);
    const props =
      Object.keys(event.properties).length > 0
        ? `  ${DIM}${JSON.stringify(event.properties)}${RESET}`
        : "";
    const dur = event.duration !== undefined ? `  ${DIM}${event.duration}ms${RESET}` : "";

    console.log(
      `${DIM}[obs ${ts}]${RESET} ${color}${event.category.padEnd(11)}${RESET} ${event.eventName.padEnd(32)} ${DIM}${event.platform}${RESET}${dur}${props}`,
    );
    if (event.errorStack && this.isDev) {
      console.log(DIM + event.errorStack + RESET);
    }
  }

  exportLog(record: LogRecord): void {
    if (!this.isDev) return;
    const color = LEVEL_COLORS[record.level] ?? RESET;
    const ts = (record.timestamp ?? new Date().toISOString()).slice(11, 23);
    const fields =
      record.fields && Object.keys(record.fields).length > 0
        ? `  ${DIM}${JSON.stringify(record.fields)}${RESET}`
        : "";

    console.log(
      `${DIM}[log ${ts}]${RESET} ${color}${record.level.toUpperCase().padEnd(5)}${RESET} ${record.message}${fields}`,
    );
    if (record.error?.stack) {
      console.log(DIM + record.error.stack + RESET);
    }
  }

  private _categoryColor(category: string): string {
    const map: Record<string, string> = {
      page: "\x1b[34m",
      business: "\x1b[32m",
      api: "\x1b[36m",
      error: "\x1b[31m",
      performance: "\x1b[33m",
      user_action: "\x1b[35m",
    };
    return map[category] ?? RESET;
  }
}
