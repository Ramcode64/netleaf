import { createRequire } from "module";
import { randomUUID } from "crypto";
import { eq, and, lte, or } from "drizzle-orm";
import { getDb, getSql, schema } from "../db/client.js";
import { crawlQueue, createJobRecord } from "../queue/jobs.js";
import type { CrawlOptions } from "../types/index.js";

// Stable 64-bit advisory-lock key. Postgres pg_try_advisory_lock takes a
// bigint; postgres-js doesn't bind JS bigints directly, so we pass it as a
// numeric literal interpolated into the SQL. Every replica competes for the
// same lock → only one wins per tick → no duplicate enqueues on scale-out.
const SCHEDULER_LOCK_KEY = "7426351928374651";

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
    const sql = getSql();

    // Try to acquire the scheduler advisory lock. If another replica already
    // holds it, return immediately — that replica will run this tick. Lock is
    // released at the end of the function so the next tick competes again.
    // sql.unsafe is fine here: the constant is a hardcoded numeric literal,
    // not user input.
    const rows = (await sql.unsafe(
      `SELECT pg_try_advisory_lock(${SCHEDULER_LOCK_KEY}) AS acquired`
    )) as unknown as { acquired: boolean }[];
    if (!rows[0]?.acquired) {
      // Another replica is leader for this tick; nothing to do.
      return;
    }

    try {
      await runTick();
    } finally {
      await sql.unsafe(`SELECT pg_advisory_unlock(${SCHEDULER_LOCK_KEY})`);
    }
  } catch (err) {
    console.warn("[scheduler] Tick error (will retry):", err instanceof Error ? err.message : err);
  }
}

async function runTick() {
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
    // Advance nextRunAt FIRST. Skipping a tick is preferable to flooding —
    // if any step below fails (Redis down, DB hiccup, etc.) the schedule
    // will still resume on its next cron slot rather than firing every 60s
    // until the failure clears, which would create orphan pending job rows.
    const nextRun = computeNextRun(schedule.cronExpression);
    try {
      await db
        .update(schema.scheduledCrawls)
        .set({ nextRunAt: nextRun })
        .where(eq(schema.scheduledCrawls.id, schedule.id));
    } catch (err) {
      console.error(`[scheduler] Could not advance nextRunAt for "${schedule.name}":`, err);
      continue;
    }

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
            `[scheduler] User ${schedule.userId} has ${active.length} active jobs — skipping "${schedule.name}" this tick (next: ${nextRun.toISOString()})`
          );
          continue; // nextRunAt already advanced above — honors cron schedule
        }
      }

      const jobId = randomUUID();
      const crawlOptions = schedule.options as CrawlOptions;
      await createJobRecord(jobId, crawlOptions, schedule.userId ?? undefined, schedule.apiKeyId ?? undefined);
      await crawlQueue.add("crawl", { jobId, options: crawlOptions }, { jobId });

      await db
        .update(schema.scheduledCrawls)
        .set({ lastRunAt: now })
        .where(eq(schema.scheduledCrawls.id, schedule.id));

      console.log(`[scheduler] Enqueued job ${jobId} for schedule "${schedule.name}" (next run: ${nextRun.toISOString()})`);
    } catch (err) {
      console.error(`[scheduler] Failed to enqueue schedule "${schedule.name}" (${schedule.id}):`, err);
    }
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
