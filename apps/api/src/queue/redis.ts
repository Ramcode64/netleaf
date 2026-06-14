import type { ConnectionOptions } from "bullmq";

/**
 * Build a plain connection-options object from a Redis URL.
 *
 * Passing options (rather than a pre-built ioredis instance) to BullMQ avoids
 * type clashes between our ioredis and the copy bundled inside bullmq, and works
 * identically at runtime. Handles the URL formats users actually use:
 *   redis://localhost:6379            (local dev)
 *   redis://redis:6379                (docker compose service name)
 *   redis://:password@host:6379       (authenticated)
 *   rediss://host:6380                (TLS)
 */
export function buildRedisConnection(redisUrl: string): ConnectionOptions {
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
