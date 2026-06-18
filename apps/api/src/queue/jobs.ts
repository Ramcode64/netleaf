import { Queue, Worker, Job } from "bullmq";
import { eq, and, lt, or } from "drizzle-orm";
import { config } from "../config/index.js";
import { crawl } from "../crawler/engine.js";
import { CrawlOptions, ScrapeFormat, ScrapeResult } from "../types/index.js";
import { getDb, schema } from "../db/client.js";
import { buildRedisConnection } from "./redis.js";
import { deliverWebhook } from "../services/webhookService.js";
import { createHash } from "crypto";

export const redisConnection = buildRedisConnection(config.redisUrl);

export const crawlQueue = new Queue<{ jobId: string; options: CrawlOptions }>(
  "crawl",
  { connection: redisConnection }
);

export async function getJob(id: string) {
  const db = getDb();
  return db.query.crawlJobs.findFirst({
    where: eq(schema.crawlJobs.id, id),
  });
}

/**
 * Mark stale `running` and `pending` crawl jobs as failed. Called at startup
 * to clean up zombies from previous deploys where SIGTERM didn't let the worker
 * drain. A job stuck in `running` for >2 hours can only mean the worker died.
 */
export async function reapZombieJobs(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const reaped = await db
    .update(schema.crawlJobs)
    .set({
      status: "failed",
      error: "Worker restarted before this job completed",
      completedAt: new Date(),
    })
    .where(
      and(
        or(eq(schema.crawlJobs.status, "running"), eq(schema.crawlJobs.status, "pending")),
        lt(schema.crawlJobs.createdAt, cutoff)
      )
    )
    .returning({ id: schema.crawlJobs.id });
  if (reaped.length > 0) {
    console.log(`[reaper] Marked ${reaped.length} zombie crawl jobs as failed.`);
  }
}

export async function createJobRecord(
  id: string,
  options: CrawlOptions,
  userId?: string,
  apiKeyId?: string,
  webhookUrl?: string
) {
  const db = getDb();
  const [job] = await db
    .insert(schema.crawlJobs)
    .values({
      id,
      userId: userId ?? null,
      apiKeyId: apiKeyId ?? null,
      status: "pending",
      startUrl: options.url,
      options: options as unknown as Record<string, unknown>,
      pages: [],
      webhookUrl: webhookUrl ?? null,
    })
    .returning();
  return job;
}

export function startWorker(): Worker {
  const worker = new Worker<{ jobId: string; options: CrawlOptions }>(
    "crawl",
    async (job: Job<{ jobId: string; options: CrawlOptions }>) => {
      const db = getDb();
      const { jobId, options } = job.data;

      await db
        .update(schema.crawlJobs)
        .set({ status: "running" })
        .where(eq(schema.crawlJobs.id, jobId));

      const accumulatedPages: ScrapeResult[] = [];
      let batchCounter = 0;

      try {
        const optionsWithHtml: CrawlOptions = {
          ...options,
          formats: [
            ...new Set<ScrapeFormat>([...(options.formats ?? ["markdown"]), "html"]),
          ],
        };

        let totalDiscovered = 0;

        await crawl(optionsWithHtml, async (page, count) => {
          const cleaned = stripHtmlFromResult(page, options.formats ?? ["markdown"]);
          accumulatedPages.push(cleaned);
          batchCounter++;
          totalDiscovered = count; // count = total links discovered so far by the engine

          // Snapshot for diff/change detection
          if (page.markdown) {
            const hash = createHash("sha256").update(page.markdown).digest("hex");
            db.insert(schema.crawlSnapshots)
              .values({ jobId, url: page.url, contentHash: hash, markdown: page.markdown })
              .catch((err) => {
                console.warn(`[jobs] Snapshot insert failed for ${page.url}:`, err instanceof Error ? err.message : err);
              });
          }

          // Batch-write to DB every 5 pages to reduce write amplification
          if (batchCounter % 5 === 0) {
            await db
              .update(schema.crawlJobs)
              .set({ pages: accumulatedPages as unknown[], totalScraped: accumulatedPages.length, totalFound: totalDiscovered })
              .where(eq(schema.crawlJobs.id, jobId));
          }
        });

        await db
          .update(schema.crawlJobs)
          .set({
            status: "completed",
            pages: accumulatedPages as unknown[],
            totalFound: totalDiscovered,
            totalScraped: accumulatedPages.length,
            completedAt: new Date(),
          })
          .where(eq(schema.crawlJobs.id, jobId));

        // Fire webhook if configured AND not already sent. BullMQ may retry this
        // worker on transient failure; without the webhookSent guard a successful
        // webhook could fire twice for the same crawl.
        const jobRecord = await getJob(jobId);
        if (jobRecord?.webhookUrl && !jobRecord.webhookSent) {
          deliverWebhook(jobRecord.webhookUrl, jobId, accumulatedPages).catch(() => {});
        }
      } catch (err) {
        await db
          .update(schema.crawlJobs)
          .set({
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
            completedAt: new Date(),
          })
          .where(eq(schema.crawlJobs.id, jobId));
      }
    },
    { connection: redisConnection, concurrency: 2 }
  );

  return worker;
}

function stripHtmlFromResult(
  result: ScrapeResult,
  requestedFormats: string[]
): ScrapeResult {
  if (!requestedFormats.includes("html")) {
    const { html: _, ...rest } = result;
    return rest;
  }
  return result;
}
