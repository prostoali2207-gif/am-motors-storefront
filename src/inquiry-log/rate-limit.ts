/**
 * Best-effort fixed-window rate limit, in memory, per server instance (issue #19).
 *
 * It does not survive restarts or span instances, so it is a cost/abuse brake on the log, not a
 * security boundary. Real protection comes from the other checks: same-origin request, strict
 * payload validation, the vehicle must currently be available, and nothing in the log is ever
 * treated as a lead without a message Sales actually received.
 */
export interface RateLimiter {
  /** True if this request may proceed. */
  allow(key: string, nowMs: number): boolean;
}

export function createRateLimiter(options: {
  readonly perKey: number;
  readonly total: number;
  readonly windowMs: number;
  /** Bounds memory when many distinct keys appear. */
  readonly maxKeys?: number;
}): RateLimiter {
  const maxKeys = options.maxKeys ?? 5_000;
  let windowStart = 0;
  let total = 0;
  const counts = new Map<string, number>();

  return {
    allow(key, nowMs) {
      if (nowMs - windowStart >= options.windowMs) {
        windowStart = nowMs;
        total = 0;
        counts.clear();
      }
      if (total >= options.total) return false;
      const used = counts.get(key) ?? 0;
      if (used >= options.perKey) return false;
      if (!counts.has(key) && counts.size >= maxKeys) return false;
      counts.set(key, used + 1);
      total += 1;
      return true;
    },
  };
}
