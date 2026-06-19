import { FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import { config } from "../../config/index.js";
import { getDb, schema } from "../../db/client.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    apiKeyId?: string;
    pagesScraped?: number;
  }
}

// Nil UUID used as the single virtual user in LOCAL_MODE. UUID-typed columns
// (scheduled_crawls.user_id, api_keys.user_id) require a valid UUID, so a plain
// "local" string sentinel can't be inserted. The nil UUID is reserved by RFC
// 4122 §4.1.7 and will never collide with a real user.
export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Local mode — skip auth entirely, useful for personal PC use.
  // Read from env at call time (not frozen config) so tests can toggle it.
  if (process.env.LOCAL_MODE === "true") {
    // Assign a stable virtual user so routes that require a userId
    // (scheduled_crawls, ownership filters) work without an API key.
    request.userId = LOCAL_USER_ID;
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.code(401).send({
      success: false,
      error: "Missing API key. Use Authorization: Bearer <key>",
    });
    return;
  }

  const rawKey = authHeader.slice(7).trim();
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const db = getDb();
  const apiKey = await db.query.apiKeys.findFirst({
    where: and(
      eq(schema.apiKeys.keyHash, keyHash),
      eq(schema.apiKeys.isActive, true)
    ),
  });

  if (!apiKey) {
    reply.code(401).send({ success: false, error: "Invalid API key" });
    return;
  }

  request.apiKeyId = apiKey.id;
  request.userId = apiKey.userId;

  // Update last_used_at without blocking the request
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, apiKey.id))
    .catch(() => {});
}
