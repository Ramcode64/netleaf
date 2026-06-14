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

export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Local mode — skip auth entirely, useful for personal PC use.
  // Leave userId/apiKeyId undefined so UUID columns receive null.
  if (config.localMode) {
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
