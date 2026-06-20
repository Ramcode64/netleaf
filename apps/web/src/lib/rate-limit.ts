/**
 * Distributed rate limiter (T-11).
 *
 * In-process Map counters don't survive Vercel's multiple serverless instances:
 * an attacker round-robining the load balancer multiplies their allowance by the
 * number of warm lambdas. When Upstash REST credentials are configured this uses
 * a shared Redis counter (INCR + EXPIRE) so the limit is global across instances.
 *
 * Falls back to the per-instance in-memory counter when Upstash isn't set — fine
 * for single-instance self-hosting. On Vercel without Upstash we warn once so the
 * operator knows the limit is best-effort.
 *
 * No new dependency: Upstash exposes a plain REST API we hit with fetch().
 */

const memory = new Map<string, { count: number; resetAt: number }>();
const MAX_MAP_SIZE = 10_000;

let warnedNoUpstash = false;

function upstashConfigured(): boolean {
  return (
    !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

async function upstashCmd(parts: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const path = parts.map((p) => encodeURIComponent(String(p))).join("/");
  const res = await fetch(`${url}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  return data.result;
}

function memoryLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (memory.size > MAX_MAP_SIZE) {
    for (const [k, v] of memory) if (now > v.resetAt) memory.delete(k);
  }
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

/**
 * Returns true when the key has exceeded `max` hits within `windowSec`.
 * Counts this call as one hit.
 */
export async function isRateLimited(
  key: string,
  max: number,
  windowSec: number
): Promise<boolean> {
  if (upstashConfigured()) {
    try {
      const count = Number(await upstashCmd(["INCR", key]));
      if (count === 1) await upstashCmd(["EXPIRE", key, windowSec]);
      return count > max;
    } catch {
      // Upstash unreachable — degrade to in-memory rather than fail open.
    }
  } else if (process.env.VERCEL && !warnedNoUpstash) {
    warnedNoUpstash = true;
    console.warn(
      "[rate-limit] Running on Vercel without UPSTASH_REDIS_REST_URL — " +
        "rate limits are per-instance only. Set Upstash env vars for a global limit."
    );
  }
  return memoryLimit(key, max, windowSec * 1000);
}
