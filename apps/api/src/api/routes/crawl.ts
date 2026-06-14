import { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireApiKey } from "../middleware/auth.js";
import { crawlQueue, createJobRecord, getJob } from "../../queue/jobs.js";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../db/client.js";
import { httpUrl } from "../../security/validators.js";

const CrawlBody = z.object({
  url: httpUrl(),
  maxPages: z.number().min(1).max(500).optional(),
  maxDepth: z.number().min(1).max(10).optional(),
  excludePatterns: z.array(z.string().max(500)).max(50).optional(),
  formats: z.array(z.enum(["markdown", "html", "text"])).optional(),
  waitForSelector: z.string().optional(),
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
}
