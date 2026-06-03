import { METRIC } from "../types/metrics";
import { ObservabilityClient } from "./client";

interface ThresholdConfig {
  /** Sliding window in milliseconds (default: 60_000 = 1 min) */
  windowMs?: number;
  /** Maximum error count per window before firing an alert (default: 10) */
  maxErrors?: number;
  /** Maximum 5xx API response rate 0–1 (default: 0.1 = 10%) */
  maxApiErrorRate?: number;
  /** Maximum slow API events per window (default: 5) */
  maxSlowApiCount?: number;
}

interface MetricBucket {
  timestamps: number[];
}

const DEFAULT: Required<ThresholdConfig> = {
  windowMs: 60_000,
  maxErrors: 10,
  maxApiErrorRate: 0.1,
  maxSlowApiCount: 5,
};

/**
 * In-process sliding-window threshold monitor.
 *
 * Records metric events and fires METRIC.ALERT_THRESHOLD_EXCEEDED when configured
 * limits are breached. All state is per-process (browser tab / server instance).
 *
 * Usage:
 *   const monitor = ThresholdMonitor.getInstance();
 *   monitor.configure({ maxErrors: 5, windowMs: 30_000 });
 *   monitor.record("api.error");
 */
export class ThresholdMonitor {
  private static instance: ThresholdMonitor | null = null;

  private config: Required<ThresholdConfig> = { ...DEFAULT };
  private buckets: Map<string, MetricBucket> = new Map();
  private apiTotal = 0;
  private apiErrors = 0;

  static getInstance(): ThresholdMonitor {
    if (!ThresholdMonitor.instance) {
      ThresholdMonitor.instance = new ThresholdMonitor();
    }
    return ThresholdMonitor.instance;
  }

  static _reset(): void {
    ThresholdMonitor.instance = null;
  }

  configure(config: ThresholdConfig): void {
    this.config = { ...DEFAULT, ...config };
  }

  /**
   * Record an event occurrence and check thresholds.
   * @param metricName  One of the METRIC constants
   */
  record(metricName: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(metricName) ?? { timestamps: [] };

    // Evict stale entries
    const cutoff = now - this.config.windowMs;
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    bucket.timestamps.push(now);
    this.buckets.set(metricName, bucket);

    this.checkThresholds(metricName, bucket.timestamps.length);

    // Track rolling API error rate
    if (metricName === METRIC.API_REQUEST) this.apiTotal++;
    if (metricName === METRIC.API_ERROR) {
      this.apiErrors++;
      this.checkApiErrorRate();
    }
  }

  private checkThresholds(metricName: string, count: number): void {
    const client = ObservabilityClient.getInstance();
    let threshold: number | null = null;

    if (metricName === METRIC.ERROR_BOUNDARY_TRIGGERED || metricName === METRIC.ERROR_UNHANDLED) {
      threshold = this.config.maxErrors;
    } else if (metricName === METRIC.API_SLOW) {
      threshold = this.config.maxSlowApiCount;
    }

    if (threshold !== null && count >= threshold) {
      client.track({
        eventName: METRIC.ALERT_THRESHOLD_EXCEEDED,
        category: "error",
        severity: "error",
        properties: {
          metric: metricName,
          count,
          threshold,
          windowMs: this.config.windowMs,
        },
      });
      // Reset bucket after alerting to avoid alert storms
      this.buckets.set(metricName, { timestamps: [] });
    }
  }

  private checkApiErrorRate(): void {
    if (this.apiTotal < 10) return; // need a minimum sample size
    const rate = this.apiErrors / this.apiTotal;
    if (rate >= this.config.maxApiErrorRate) {
      ObservabilityClient.getInstance().track({
        eventName: METRIC.ALERT_THRESHOLD_EXCEEDED,
        category: "error",
        severity: "error",
        properties: {
          metric: "api.error_rate",
          rate: Math.round(rate * 100),
          threshold: Math.round(this.config.maxApiErrorRate * 100),
          totalRequests: this.apiTotal,
          errorRequests: this.apiErrors,
        },
      });
      // Reset counters after alerting
      this.apiTotal = 0;
      this.apiErrors = 0;
    }
  }
}
