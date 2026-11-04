/**
 * Per-isolate fixed-window rate limiter (PRD §7.3, lightweight v1).
 * Good enough for free-tier abuse control; a durable limiter (KV/DO) can
 * replace it without touching call sites.
 */

interface WindowState {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowState>();

// Stale entries are purged opportunistically so the Map stays bounded in a
// long-lived isolate (hardening, M6): every 1024 calls, drop expired windows.
let callsSinceSweep = 0;
const SWEEP_EVERY = 1024;

function sweep(now: number): void {
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (++callsSinceSweep >= SWEEP_EVERY) {
    callsSinceSweep = 0;
    sweep(now);
  }
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (w.count >= limit) return false;
  w.count += 1;
  return true;
}

/** Best-effort client IP for rate-limit keys. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
