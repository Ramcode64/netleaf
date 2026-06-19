import { FastifyRequest, FastifyReply } from "fastify";
import { getDb, schema } from "../../db/client.js";
import { LOCAL_USER_ID } from "./auth.js";

/**
 * Records a usage event after each /v1/* response. Registered as an onResponse
 * hook, so it never blocks or affects the response. Fully defensive: any DB
 * error (including a missing/unavailable DATABASE_URL) is swallowed.
 */
export async function trackUsage(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Fastify v4: prefer routeOptions.url; fall back to raw url.
  const routePath = request.routeOptions?.url ?? request.url;
  if (!routePath.startsWith("/v1/")) return;

  // No meaningful user to attribute. Local mode shares one virtual user
  // (LOCAL_USER_ID) — usage tracking would just clutter the table with
  // unattributable rows.
  if (!request.userId || request.userId === LOCAL_USER_ID) return;

  try {
    const db = getDb();
    await db
      .insert(schema.usageEvents)
      .values({
        apiKeyId: request.apiKeyId ?? null,
        userId: request.userId,
        endpoint: routePath,
        pagesScraped: request.pagesScraped ?? 1,
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      });
  } catch {
    // Usage tracking is best-effort — never let it surface to the client.
  }
}
