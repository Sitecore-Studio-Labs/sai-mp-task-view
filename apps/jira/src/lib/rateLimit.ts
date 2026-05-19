/**
 * In-memory sliding-window rate limiter.
 *
 * Stores timestamps of requests per key in a Map. On each call, timestamps
 * outside the window are evicted, then the remaining count is checked against
 * the limit. Thread-safe for single-process Node.js (no shared state across
 * serverless replicas — swap the store for Redis/Upstash for multi-instance).
 */

const store = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest request falls out of the window. */
  retryAfter: number;
}

export function rateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0]!;
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true, retryAfter: 0 };
}

/** Extract the best available client identifier from a request. */
export function getClientKey(request: Request): string {
  const forwarded = (request.headers as Headers).get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}
