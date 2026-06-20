import { pool } from "./scraper/browser.js";
import { startWorker, reapZombieJobs } from "./queue/jobs.js";
import { buildServer } from "./api/server.js";
import { config } from "./config/index.js";
import { seedLegacyKeys, seedLocalUser } from "./db/seed.js";
import { startScheduler, stopScheduler } from "./services/scheduler.js";
import { assertEgressPosture } from "./security/ssrf.js";

async function main() {
  // Refuse to start with LOCAL_MODE=true in production — local mode bypasses
  // ownership checks in /v1/crawl/:id, /v1/diff, and /v1/crawl/:id/export.
  // If this combination leaked into a public deployment, anyone who could
  // guess (or learn) a job UUID would be able to download its content.
  if (config.localMode && process.env.NODE_ENV === "production") {
    throw new Error(
      "LOCAL_MODE=true is incompatible with NODE_ENV=production. " +
      "LOCAL_MODE disables per-user ownership checks and is only safe on a personal machine. " +
      "Set LOCAL_MODE=false and provision API keys for production deployments."
    );
  }

  // Run legacy key migration if needed
  if (config.databaseUrl) {
    // LOCAL_MODE assigns a nil-UUID virtual user to every request; the FK
    // constraint on crawl_jobs.user_id / scheduled_crawls.user_id requires
    // the matching users row to exist. Idempotent — does nothing in
    // authenticated mode.
    await seedLocalUser().catch((err) =>
      console.warn("Local user seed skipped:", err.message)
    );

    await seedLegacyKeys().catch((err) =>
      console.warn("Legacy key migration skipped:", err.message)
    );

    // Mark crawl jobs left in `running` for more than 2 hours as failed.
    // These are zombies from previous deploys where SIGTERM didn't let the
    // worker drain in-flight crawls. Without this they show as "running"
    // forever in the dashboard.
    await reapZombieJobs().catch((err) =>
      console.warn("Zombie job reaper failed:", err.message)
    );
  }

  // H-4: warn if the browser egress path isn't declared firewalled in prod.
  assertEgressPosture();

  console.log("Starting browser pool...");
  await pool.init();

  console.log("Starting crawl worker...");
  const worker = startWorker();

  if (config.databaseUrl) {
    console.log("Starting scheduler (60s poll interval)...");
    startScheduler();
  }

  const app = await buildServer();
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`Netleaf API running on http://localhost:${config.port}`);
  if (config.localMode) {
    console.log("Local mode: auth disabled — no API key required");
  }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return; // Second SIGTERM during drain → ignore
    shuttingDown = true;
    console.log("Shutting down — draining worker (up to 60s for in-flight crawls)...");
    stopScheduler();
    await app.close();
    // worker.close() without force=true waits for currently-running jobs to
    // finish before closing. Combined with the zombie reaper at startup,
    // this prevents crawl_jobs rows being stuck in `running` status after
    // a deploy/restart.
    try {
      await Promise.race([
        worker.close(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("drain timeout")), 60_000)),
      ]);
    } catch (err) {
      console.warn("Worker drain timed out — forcing close:", err instanceof Error ? err.message : err);
      await worker.close(true);
    }
    await pool.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
