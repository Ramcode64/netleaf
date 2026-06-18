import { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireApiKey } from "../middleware/auth.js";
import { crawlQueue, createJobRecord, getJob } from "../../queue/jobs.js";
import { and, eq, or } from "drizzle-orm";
import { getDb, schema } from "../../db/client.js";
import { httpUrl } from "../../security/validators.js";

const CrawlBody = z.object({
  url: httpUrl(),
  maxPages: z.number().min(1).max(500).optional(),
  maxDepth: z.number().min(1).max(10).optional(),
  excludePatterns: z.array(z.string().max(500)).max(50).optional(),
  formats: z.array(z.enum(["markdown", "html", "text"])).optional(),
  waitForSelector: z.string().max(500).optional(),
  webhookUrl: httpUrl("webhookUrl must be a valid http(s) URL").optional(),
});

export async function crawlRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/crawl",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const parsed = CrawlBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        });
      }

      const jobId = uuidv4();
      const { webhookUrl, ...crawlOptions } = parsed.data;

      // Prevent a single user from monopolising the BullMQ queue.
      // Without a cap, an authenticated user can submit 100 jobs/min (the global
      // rate limit), each crawling up to 500 pages — effectively a resource-exhaustion
      // DoS that blocks all other users for hours.
      if (request.userId) {
        const db = getDb();
        const active = await db
          .select({ id: schema.crawlJobs.id })
          .from(schema.crawlJobs)
          .where(
            and(
              eq(schema.crawlJobs.userId, request.userId),
              or(
                eq(schema.crawlJobs.status, "pending"),
                eq(schema.crawlJobs.status, "running")
              )
            )
          );
        if (active.length >= 5) {
          return reply.code(429).send({
            success: false,
            error: "Too many active crawl jobs. Wait for existing jobs to complete.",
          });
        }
      }

      // webhookUrl is stored atomically in the initial INSERT to avoid a race
      // where a fast worker could complete the job before a separate UPDATE arrives.
      await createJobRecord(jobId, crawlOptions, request.userId, request.apiKeyId, webhookUrl);

      await crawlQueue.add("crawl", { jobId, options: crawlOptions }, { jobId });

      return reply.code(202).send({
        success: true,
        data: { jobId, statusUrl: `/v1/crawl/${jobId}` },
      });
    }
  );

  // Attach / update a webhook on an existing job (fired when the crawl completes)
  app.post(
    "/v1/crawl/:jobId/webhook",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      if (!z.string().uuid().safeParse(jobId).success) {
        return reply.code(400).send({ success: false, error: "Invalid job ID" });
      }

      const parsed = z
        .object({ webhookUrl: httpUrl("webhookUrl must be a valid http(s) URL") })
        .safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        });
      }

      const job = await getJob(jobId);
      if (!job) {
        return reply.code(404).send({ success: false, error: "Job not found" });
      }

      // Ownership check in authenticated mode
      if (request.userId && job.userId !== request.userId) {
        return reply.code(404).send({ success: false, error: "Job not found" });
      }

      if (job.status === "completed" || job.status === "failed") {
        return reply.code(409).send({
          success: false,
          error: `Cannot attach webhook: job already ${job.status}`,
        });
      }

      await getDb()
        .update(schema.crawlJobs)
        .set({ webhookUrl: parsed.data.webhookUrl, webhookSent: false })
        .where(eq(schema.crawlJobs.id, jobId));

      return reply.send({
        success: true,
        data: { jobId, webhookUrl: parsed.data.webhookUrl },
      });
    }
  );

  app.get(
    "/v1/crawl/:jobId",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      if (!z.string().uuid().safeParse(jobId).success) {
        return reply.code(400).send({ success: false, error: "Invalid job ID" });
      }
      const job = await getJob(jobId);

      if (!job) {
        return reply.code(404).send({ success: false, error: "Job not found" });
      }

      // Ownership check in authenticated mode
      if (request.userId && job.userId !== request.userId) {
        return reply.code(404).send({ success: false, error: "Job not found" });
      }

      return reply.send({
        success: true,
        data: {
          id: job.id,
          status: job.status,
          startUrl: job.startUrl,
          totalScraped: job.totalScraped,
          totalFound: job.totalFound,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          pages: job.status === "completed" ? job.pages : [],
          error: job.error,
        },
      });
    }
  );

  // Thin status-only endpoint. The full /v1/crawl/:jobId returns the entire
  // `pages` JSONB on every call — on a 500-page crawl that's 50+ MB of JSON
  // per poll. Pollers should use this route instead; only fetch the full
  // payload once status === "completed".
  app.get(
    "/v1/crawl/:jobId/status",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      if (!z.string().uuid().safeParse(jobId).success) {
        return reply.code(400).send({ success: false, error: "Invalid job ID" });
      }

      const db = getDb();
      const [job] = await db
        .select({
          id: schema.crawlJobs.id,
          userId: schema.crawlJobs.userId,
          status: schema.crawlJobs.status,
          totalScraped: schema.crawlJobs.totalScraped,
          totalFound: schema.crawlJobs.totalFound,
          createdAt: schema.crawlJobs.createdAt,
          completedAt: schema.crawlJobs.completedAt,
          error: schema.crawlJobs.error,
        })
        .from(schema.crawlJobs)
        .where(eq(schema.crawlJobs.id, jobId))
        .limit(1);

      if (!job) {
        return reply.code(404).send({ success: false, error: "Job not found" });
      }
      if (request.userId && job.userId !== request.userId) {
        return reply.code(404).send({ success: false, error: "Job not found" });
      }

      return reply.send({
        success: true,
        data: {
          id: job.id,
          status: job.status,
          totalScraped: job.totalScraped,
          totalFound: job.totalFound,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          error: job.error,
        },
      });
    }
  );
}
