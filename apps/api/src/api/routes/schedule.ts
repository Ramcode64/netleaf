import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireApiKey } from "../middleware/auth.js";
import { getDb, schema } from "../../db/client.js";
import { validateCronExpression, computeNextRun } from "../../services/scheduler.js";
import type { CrawlOptions } from "../../types/index.js";
import { httpUrl } from "../../security/validators.js";
import { formatZodError } from "../zod-format.js";

const CreateScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  cronExpression: z.string().min(1).max(120),
  url: httpUrl(),
  maxPages: z.number().int().min(1).max(1000).optional().default(100),
  formats: z
    .array(z.enum(["markdown", "html", "text"]))
    .optional()
    .default(["markdown"]),
  webhookUrl: httpUrl("webhookUrl must be a valid http(s) URL").optional(),
});

export async function scheduleRoutes(app: FastifyInstance): Promise<void> {
  // POST /v1/schedule — create a scheduled crawl
  app.post(
    "/v1/schedule",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const parsed = CreateScheduleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: formatZodError(parsed.error),
        });
      }

      const { name, cronExpression, url, maxPages, formats, webhookUrl } = parsed.data;

      if (!validateCronExpression(cronExpression)) {
        return reply.status(400).send({
          success: false,
          error: "Invalid cron expression.",
        });
      }

      // Reject sub-5-minute intervals — e.g. "* * * * *" (every 1 min) would let
      // one user schedule 20 crawl jobs per minute and saturate the queue.
      const nextA = computeNextRun(cronExpression);
      const nextB = computeNextRun(cronExpression, nextA);
      if (nextB.getTime() - nextA.getTime() < 5 * 60 * 1000) {
        return reply.status(400).send({
          success: false,
          error: "Cron interval must be at least 5 minutes between runs.",
        });
      }

      const req = request as typeof request & { userId?: string; apiKeyId?: string };
      const userId = req.userId;
      if (!userId) {
        return reply.status(401).send({ success: false, error: "Authentication required" });
      }

      // Cap schedules per user — unlimited schedules × sub-hourly intervals would
      // let a single user generate crawl jobs faster than the worker can drain them.
      const db = getDb();
      const existing = await db
        .select({ id: schema.scheduledCrawls.id })
        .from(schema.scheduledCrawls)
        .where(eq(schema.scheduledCrawls.userId, userId));
      if (existing.length >= 20) {
        return reply.status(400).send({
          success: false,
          error: "Maximum of 20 scheduled crawls per user allowed.",
        });
      }

      const crawlOptions: CrawlOptions = {
        url,
        maxPages,
        formats: formats as CrawlOptions["formats"],
        ...(webhookUrl ? { webhookUrl } : {}),
      };

      const nextRunAt = computeNextRun(cronExpression);

      const [schedule] = await db
        .insert(schema.scheduledCrawls)
        .values({
          userId,
          apiKeyId: req.apiKeyId ?? null,
          name,
          cronExpression,
          options: crawlOptions as unknown as Record<string, unknown>,
          nextRunAt,
          isActive: true,
        })
        .returning();

      return reply.status(201).send({ success: true, data: schedule });
    }
  );

  // GET /v1/schedule — list user's scheduled crawls
  app.get(
    "/v1/schedule",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const req = request as typeof request & { userId?: string };
      if (!req.userId) {
        return reply.status(401).send({ success: false, error: "Authentication required" });
      }

      const db = getDb();
      const schedules = await db
        .select()
        .from(schema.scheduledCrawls)
        .where(eq(schema.scheduledCrawls.userId, req.userId));

      return reply.send({ success: true, data: schedules });
    }
  );

  // GET /v1/schedule/:id — fetch one schedule by id (E2-10).
  // PATCH and DELETE already work by id; GET-by-id closes the REST symmetry
  // so polling clients don't have to filter the full list response.
  app.get(
    "/v1/schedule/:id",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const req = request as typeof request & { userId?: string };
      const { id } = request.params as { id: string };
      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(404).send({ success: false, error: "Schedule not found" });
      }
      if (!req.userId) {
        return reply.status(401).send({ success: false, error: "Authentication required" });
      }

      const db = getDb();
      const [schedule] = await db
        .select()
        .from(schema.scheduledCrawls)
        .where(
          and(
            eq(schema.scheduledCrawls.id, id),
            eq(schema.scheduledCrawls.userId, req.userId)
          )
        )
        .limit(1);

      if (!schedule) {
        return reply.status(404).send({ success: false, error: "Schedule not found" });
      }

      return reply.send({ success: true, data: schedule });
    }
  );

  // DELETE /v1/schedule/:id — delete a scheduled crawl
  app.delete(
    "/v1/schedule/:id",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const req = request as typeof request & { userId?: string };
      const { id } = request.params as { id: string };
      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(404).send({ success: false, error: "Schedule not found" });
      }

      if (!req.userId) {
        return reply.status(401).send({ success: false, error: "Authentication required" });
      }

      const db = getDb();
      const deleted = await db
        .delete(schema.scheduledCrawls)
        .where(
          and(
            eq(schema.scheduledCrawls.id, id),
            eq(schema.scheduledCrawls.userId, req.userId)
          )
        )
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({ success: false, error: "Schedule not found" });
      }

      return reply.send({ success: true, data: { deleted: true, id } });
    }
  );

  // PATCH /v1/schedule/:id — toggle active status
  app.patch(
    "/v1/schedule/:id",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const req = request as typeof request & { userId?: string };
      const { id } = request.params as { id: string };
      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(404).send({ success: false, error: "Schedule not found" });
      }

      if (!req.userId) {
        return reply.status(401).send({ success: false, error: "Authentication required" });
      }

      const parsed = z.object({ isActive: z.boolean() }).safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: "isActive (boolean) required" });
      }

      const db = getDb();

      // Look up the current schedule so we can decide whether to recompute nextRunAt.
      // When reactivating a previously-paused schedule, nextRunAt may be in the past
      // (possibly by days). Without recomputing, the scheduler fires immediately on
      // the next tick instead of honoring the cron expression.
      const [current] = await db
        .select()
        .from(schema.scheduledCrawls)
        .where(
          and(
            eq(schema.scheduledCrawls.id, id),
            eq(schema.scheduledCrawls.userId, req.userId)
          )
        )
        .limit(1);

      if (!current) {
        return reply.status(404).send({ success: false, error: "Schedule not found" });
      }

      const set: { isActive: boolean; nextRunAt?: Date } = { isActive: parsed.data.isActive };
      if (parsed.data.isActive && !current.isActive) {
        set.nextRunAt = computeNextRun(current.cronExpression);
      }

      const updated = await db
        .update(schema.scheduledCrawls)
        .set(set)
        .where(
          and(
            eq(schema.scheduledCrawls.id, id),
            eq(schema.scheduledCrawls.userId, req.userId)
          )
        )
        .returning();

      if (updated.length === 0) {
        return reply.status(404).send({ success: false, error: "Schedule not found" });
      }

      return reply.send({ success: true, data: updated[0] });
    }
  );
}
