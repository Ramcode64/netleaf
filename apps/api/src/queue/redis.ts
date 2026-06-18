import IORedis, { type RedisOptions } from "ioredis";
import type { ConnectionOptions } from "bullmq";

/**
 * Parse a Redis URL into the options shape both BullMQ and ioredis accept.
 * Handles the URL formats users actually use:
 *   redis://localhost:6379            (local dev)
 *   redis://redis:6379                (docker compose service name)
 *   redis://:password@host:6379       (authenticated)
 *   rediss://host:6380                (TLS)
 */
function parseRedisUrl(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}

/**
 * Build a BullMQ connection (plain options object). Passing options rather
 * than a live ioredis avoids type clashes between our ioredis and the copy
 * bundled inside bullmq, while behaving identically at runtime.
 */
export function buildRedisConnection(redisUrl: string): ConnectionOptions {
  return parseRedisUrl(redisUrl) as ConnectionOptions;
}

/**
 * Build a live ioredis client for plugins that require one (e.g.
 * @fastify/rate-limit's Redis store, which calls client.defineCommand at
 * registration time). Returns null on bad URLs so test environments without
 * Redis can fall back to the in-memory rate-limit store.
 */
export function buildRedisClient(redisUrl: string): IORedis | null {
  try {
    return new IORedis(parseRedisUrl(redisUrl));
  } catch {
    return null;
  }
}
