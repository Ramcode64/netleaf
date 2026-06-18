import { pool } from "./scraper/browser.js";
import { startWorker } from "./queue/jobs.js";
import { buildServer } from "./api/server.js";
import { config } from "./config/index.js";
import { seedLegacyKeys } from "./db/seed.js";
import { startScheduler, stopScheduler } from "./services/scheduler.js";

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
    await seedLegacyKeys().catch((err) =>
      console.warn("Legacy key migration skipped:", err.message)
    );
  }

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

  const shutdown = async () => {
    console.log("Shutting down...");
    stopScheduler();
    await app.close();
    await worker.close();
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
