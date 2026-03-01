/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-instance deployments (Vercel serverless has per-instance state).
 * For distributed rate limiting, swap this for Upstash/Redis-backed implementation.
 */

const store = new Map<string, number[]>()

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  const cutoff = now - windowMs
  for (const [key, timestamps] of store) {
    const valid = timestamps.filter((t) => t > cutoff)
    if (valid.length === 0) {
      store.delete(key)
    } else {
      store.set(key, valid)
    }
  }
}

export function rateLimit({
  windowMs = 60_000,
  max = 10,
}: {
  windowMs?: number
  max?: number
} = {}) {
  return function check(key: string): { allowed: boolean; remaining: number } {
    cleanup(windowMs)
    const now = Date.now()
    const cutoff = now - windowMs
    const timestamps = (store.get(key) || []).filter((t) => t > cutoff)

    if (timestamps.length >= max) {
      store.set(key, timestamps)
      return { allowed: false, remaining: 0 }
    }

    timestamps.push(now)
    store.set(key, timestamps)
    return { allowed: true, remaining: max - timestamps.length }
  }
}
