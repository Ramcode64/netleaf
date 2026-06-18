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
      webhookUrl: webhookUrl ?? null,
    })
    .returning();
  return job;
}

/**
 * Persist one scraped page as a row in crawl_pages. ON CONFLICT (job_id, idx)
 * DO NOTHING makes this idempotent against BullMQ worker retries: the same
 * page indexed at the same position will not be inserted twice.
 */
async function persistPage(
  jobId: string,
  idx: number,
  page: ScrapeResult,
  requestedFormats: string[]
): Promise<void> {
  const db = getDb();
  const includeHtml = requestedFormats.includes("html");
  const includeText = requestedFormats.includes("text");
  await db
    .insert(schema.crawlPages)
    .values({
      jobId,
      idx,
      url: page.url,
      success: page.success,
      statusCode: page.metadata?.statusCode ?? null,
      title: page.metadata?.title ?? null,
      description: page.metadata?.description ?? null,
      markdown: page.markdown ?? null,
      html: includeHtml ? page.html ?? null : null,
      text: includeText ? page.text ?? null : null,
      error: page.error ?? null,
    })
    .onConflictDoNothing({ target: [schema.crawlPages.jobId, schema.crawlPages.idx] });
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

      let pageCount = 0;

      try {
        // Engine needs HTML to extract links from each page even if the caller
        // doesn't want HTML in the final output. We pass `html` to the engine
        // and let persistPage decide whether to actually store it.
        const requestedFormats = options.formats ?? ["markdown"];
        const optionsWithHtml: CrawlOptions = {
          ...options,
          formats: [...new Set<ScrapeFormat>([...requestedFormats, "html"])],
        };

        let totalDiscovered = 0;

        await crawl(optionsWithHtml, async (page, count) => {
          totalDiscovered = count;

          // Insert one row per page — constant-time write, no read-modify-write
          // amplification. The unique (job_id, idx) index makes this idempotent
          // if BullMQ retries the worker.
          await persistPage(jobId, pageCount, page, requestedFormats);
          pageCount++;

          // Snapshot for diff/change detection (separate table, separate concern)
          if (page.markdown) {
            const hash = createHash("sha256").update(page.markdown).digest("hex");
            db.insert(schema.crawlSnapshots)
              .values({ jobId, url: page.url, contentHash: hash, markdown: page.markdown })
              .catch((err) => {
                console.warn(`[jobs] Snapshot insert failed for ${page.url}:`, err instanceof Error ? err.message : err);
              });
          }

          // Update running totals every 5 pages. Cheap because the row is small
          // now that `pages` is gone.
          if (pageCount % 5 === 0) {
            await db
              .update(schema.crawlJobs)
              .set({ totalScraped: pageCount, totalFound: totalDiscovered })
              .where(eq(schema.crawlJobs.id, jobId));
          }
        });

        await db
          .update(schema.crawlJobs)
          .set({
            status: "completed",
            totalFound: totalDiscovered,
            totalScraped: pageCount,
            completedAt: new Date(),
          })
          .where(eq(schema.crawlJobs.id, jobId));

        // Fire webhook if configured AND not already sent. BullMQ may retry this
        // worker on transient failure; without the webhookSent guard a successful
        // webhook could fire twice for the same crawl.
        const jobRecord = await getJob(jobId);
        if (jobRecord?.webhookUrl && !jobRecord.webhookSent) {
          // Webhook payload is now fetched from crawl_pages inside deliverWebhook
          // (no longer accumulated in memory by the worker).
          deliverWebhook(jobRecord.webhookUrl, jobId).catch(() => {});
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
