import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import { requireApiKey } from "../middleware/auth.js";
import { getDb, schema } from "../../db/client.js";

const CreateKeyBody = z.object({
  name: z.string().min(1).max(100),
});

export async function keysRoutes(app: FastifyInstance): Promise<void> {
  // Create a new API key
  app.post(
    "/v1/keys",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const parsed = CreateKeyBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Name is required" });
      }

      // API keys only make sense in authenticated mode. Reject cleanly in
      // LOCAL_MODE — auth is bypassed there, so keys are meaningless.
      if (process.env.LOCAL_MODE === "true") {
        return reply.code(400).send({ success: false, error: "API key management is disabled in local mode" });
      }
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ success: false, error: "Authentication required" });
      }

      const db = getDb();

      const existing = await db
        .select({ id: schema.apiKeys.id })
        .from(schema.apiKeys)
        .where(and(eq(schema.apiKeys.userId, userId), eq(schema.apiKeys.isActive, true)));
      if (existing.length >= 10) {
        return reply.code(400).send({ success: false, error: "Maximum of 10 active API keys allowed" });
      }

      const rawKey = `nl_${randomBytes(32).toString("hex")}`;
      const keyHash = createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.slice(0, 16);
      const [key] = await db
        .insert(schema.apiKeys)
        .values({
          userId,
          name: parsed.data.name,
          keyHash,
          keyPrefix,
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: {
          id: key.id,
          name: key.name,
          key: rawKey, // shown ONCE — never stored
          prefix: key.keyPrefix,
          createdAt: key.createdAt,
        },
      });
    }
  );

  // List API keys for the current user
  app.get(
    "/v1/keys",
    { preHandler: requireApiKey },
    async (request, reply) => {
      // E2-4: in LOCAL_MODE all three (GET / POST / DELETE) return the same
      // disabled envelope. Returning {data:[]} from GET while POST/DELETE
      // reject is inconsistent — external clients can't tell whether keys
      // are unsupported or just not yet created.
      if (process.env.LOCAL_MODE === "true") {
        return reply.code(400).send({
          success: false,
          error: "API key management is disabled in local mode",
        });
      }
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ success: false, error: "Authentication required" });
      }

      const db = getDb();
      const keys = await db.query.apiKeys.findMany({
        where: and(
          eq(schema.apiKeys.userId, userId),
          eq(schema.apiKeys.isActive, true)
        ),
        columns: {
          keyHash: false, // never expose the hash
        },
      });

      return reply.send({ success: true, data: keys });
    }
  );

  // Revoke an API key
  app.delete(
    "/v1/keys/:id",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      // A-3: LOCAL_MODE check first so the "disabled" message is consistent with
      // create/list, regardless of whether the id is a valid UUID.
      if (process.env.LOCAL_MODE === "true") {
        return reply.code(400).send({ success: false, error: "API key management is disabled in local mode" });
      }
      if (!z.string().uuid().safeParse(id).success) {
        return reply.code(400).send({ success: false, error: "Invalid key ID" });
      }
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ success: false, error: "Authentication required" });
      }

      const db = getDb();
      const [updated] = await db
        .update(schema.apiKeys)
        .set({ isActive: false, revokedAt: new Date() })
        .where(
          and(
            eq(schema.apiKeys.id, id),
            eq(schema.apiKeys.userId, userId)
          )
        )
        .returning({ id: schema.apiKeys.id });

      if (!updated) {
        return reply.code(404).send({ success: false, error: "Key not found" });
      }

      return reply.send({ success: true, data: { revoked: true } });
    }
  );
}
