import { createRequire } from "module";
import { randomUUID } from "crypto";
import { eq, and, lte, or } from "drizzle-orm";
import { getDb, schema } from "../db/client.js";
import { crawlQueue, createJobRecord } from "../queue/jobs.js";
import type { CrawlOptions } from "../types/index.js";

const require = createRequire(import.meta.url);
// cron-parser is CJS (v4 API: parseExpression)
const cronParser = require("cron-parser") as {
  parseExpression: (expr: string, opts?: object) => { next(): { toDate(): Date } };
};

export function computeNextRun(cronExpression: string, after = new Date()): Date {
  const interval = cronParser.parseExpression(cronExpression, { currentDate: after });
  return interval.next().toDate();
}

export function validateCronExpression(cronExpression: string): boolean {
  try {
    cronParser.parseExpression(cronExpression);
    return true;
  } catch {
    return false;
  }
}

const POLL_INTERVAL_MS = 60_000;
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

async function tick() {
  try {
    const db = getDb();
    const now = new Date();

    const due = await db
      .select()
      .from(schema.scheduledCrawls)
      .where(
        and(
          eq(schema.scheduledCrawls.isActive, true),
          lte(schema.scheduledCrawls.nextRunAt, now)
        )
      );

    for (const schedule of due) {
      try {
        // Respect the same per-user active-job cap enforced by the crawl route.
        // Without this check the scheduler bypasses the cap and can flood the queue.
        if (schedule.userId) {
          const active = await db
            .select({ id: schema.crawlJobs.id })
            .from(schema.crawlJobs)
            .where(
              and(
                eq(schema.crawlJobs.userId, schedule.userId),
                or(
                  eq(schema.crawlJobs.status, "pending"),
                  eq(schema.crawlJobs.status, "running")
                )
              )
            );
          if (active.length >= 5) {
            console.warn(
              `[scheduler] User ${schedule.userId} has ${active.length} active jobs — skipping "${schedule.name}" this tick`
            );
            continue; // nextRunAt unchanged — will retry next tick when a slot opens
          }
        }

        const jobId = randomUUID();
        const crawlOptions = schedule.options as CrawlOptions;
        await createJobRecord(jobId, crawlOptions, schedule.userId ?? undefined, schedule.apiKeyId ?? undefined);
        await crawlQueue.add("crawl", { jobId, options: crawlOptions }, { jobId });

        const nextRun = computeNextRun(schedule.cronExpression);
        await db
          .update(schema.scheduledCrawls)
          .set({ lastRunAt: now, nextRunAt: nextRun })
          .where(eq(schema.scheduledCrawls.id, schedule.id));

        console.log(`[scheduler] Enqueued job ${jobId} for schedule "${schedule.name}" (next run: ${nextRun.toISOString()})`);
      } catch (err) {
        console.error(`[scheduler] Failed to enqueue schedule "${schedule.name}" (${schedule.id}):`, err);
      }
    }
  } catch (err) {
    // DB may not be available on first startup tick — log and retry next interval
    console.warn("[scheduler] Tick error (will retry):", err instanceof Error ? err.message : err);
  }
}

export function startScheduler(): void {
  if (schedulerInterval) return;
  // Run immediately to catch any overdue schedules from downtime
  void tick();
  schedulerInterval = setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);
  // Don't block process exit
  schedulerInterval.unref();
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
