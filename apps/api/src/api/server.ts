import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { createHash } from "crypto";
import { config } from "../config/index.js";
import { scrapeRoutes } from "./routes/scrape.js";
import { crawlRoutes } from "./routes/crawl.js";
import { healthRoutes } from "./routes/health.js";
import { keysRoutes } from "./routes/keys.js";
import { mapRoutes } from "./routes/map.js";
import { extractRoutes } from "./routes/extract.js";
import { searchRoutes } from "./routes/search.js";
import { diffRoutes } from "./routes/diff.js";
import { scheduleRoutes } from "./routes/schedule.js";
import { exportRoutes } from "./routes/export.js";
import { trackUsage } from "./middleware/usage.js";
import { buildRedisClient } from "../queue/redis.js";

export async function buildServer() {
  const app = Fastify({
    // Cap request bodies (default is 1MB; make it explicit + tighter). All our
    // endpoints take small JSON payloads; this blocks large-payload DoS.
    bodyLimit: 256 * 1024, // 256 KB
    logger: {
      transport:
        config.env === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // Restrict cross-origin access to configured origins. Set CORS_ORIGIN=* to
  // allow any origin (e.g. public-facing self-hosted API), or comma-separate
  // specific origins: CORS_ORIGIN=https://app.example.com,http://localhost:3001
  const corsOrigin: string | string[] | boolean = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN === "*"
      ? true
      : process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : false;
  await app.register(cors, { origin: corsOrigin });

  // Use Redis as the shared store so multiple API replicas enforce one global
  // counter per key. With the default in-memory store, N replicas multiply
  // the effective limit by N (and DoS protection scales with luck, not config).
  // In test environments without a reachable Redis, we silently fall back to
  // the in-memory store — single-process correctness is preserved.
  const rateLimitRedis = config.env === "test" ? null : buildRedisClient(config.redisUrl);

  await app.register(rateLimit, {
    max: config.localMode ? 10000 : 100,
    timeWindow: "1 minute",
    ...(rateLimitRedis ? { redis: rateLimitRedis, nameSpace: "rl:" } : {}),
    // @fastify/rate-limit runs as an onRequest hook — BEFORE the requireApiKey
    // preHandler — so req.userId is not set yet. Key on the bearer token's hash
    // (available immediately from headers) so per-key limiting actually works;
    // fall back to client IP for unauthenticated/local requests.
    keyGenerator: (req) => {
      const auth = req.headers.authorization;
      if (auth?.startsWith("Bearer ")) {
        return "k:" + createHash("sha256").update(auth.slice(7).trim()).digest("hex");
      }
      // Use the raw socket IP, not req.ip, to prevent rate-limit bypass via a
      // spoofed X-Forwarded-For header on unauthenticated requests.
      return "ip:" + (req.socket?.remoteAddress ?? "anon");
    },
    errorResponseBuilder: () => ({
      success: false,
      error: "Rate limit exceeded. Max 100 requests/minute.",
    }),
  });

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Security headers on every response. These matter even for a JSON API:
  // nosniff prevents browsers MIME-sniffing JSON as script; X-Frame-Options
  // blocks clickjacking if the API is ever opened in a browser; the others
  // are standard hardening.
  app.addHook("onSend", (_req, reply, _payload, done) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "interest-cohort=()");
    done();
  });

  // Usage tracking — runs after response is sent, doesn't block
  app.addHook("onResponse", trackUsage);

  // Consistent envelope for unmatched routes — the rest of the API uses
  // {success, error}, so 404 should too. Default Fastify reply is an empty body.
  app.setNotFoundHandler((request, reply) => {
    reply
      .code(404)
      .send({ success: false, error: `Route ${request.method} ${request.url} not found` });
  });

  // Top-level error handler — turns infrastructure errors (DNS, ECONNREFUSED,
  // pool exhaustion) into 503 without leaking the internal hostname or stack.
  // Anything else falls through to a generic 500 with the request ID logged.
  // 4xx errors thrown via reply.code()/handlers come through here too; we
  // respect a pre-set statusCode rather than overriding it.
  app.setErrorHandler((err, request, reply) => {
    const errCode = (err as { code?: string }).code ?? "";
    const isConnError =
      ["EAI_AGAIN", "ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH"].includes(
        errCode
      ) ||
      /(getaddrinfo|connect ECONN|connection terminated|pool|postgres|redis)/i.test(err.message);

    if (isConnError) {
      request.log.error({ err, code: errCode }, "infrastructure error");
      return reply.code(503).send({
        success: false,
        error: "Service temporarily unavailable. Please retry shortly.",
      });
    }

    // Body-too-large, malformed JSON, etc. — Fastify sets statusCode on the error
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      return reply.code(err.statusCode).send({
        success: false,
        error: err.message || "Bad request",
      });
    }

    // Anything else: log full detail server-side, return a generic 500
    request.log.error({ err }, "unhandled error");
    return reply.code(500).send({
      success: false,
      error: "Internal server error",
    });
  });

  await app.register(healthRoutes);
  await app.register(scrapeRoutes);
  await app.register(crawlRoutes);
  await app.register(keysRoutes);
  await app.register(mapRoutes);
  await app.register(extractRoutes);
  await app.register(searchRoutes);
  await app.register(diffRoutes);
  await app.register(scheduleRoutes);
  await app.register(exportRoutes);

  return app;
}
