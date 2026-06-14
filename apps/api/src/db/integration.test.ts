import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let client: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client, { schema });

  // Apply the real generated migration SQL — this validates the schema
  // exactly as it will be applied to production Postgres.
  const migrationsDir = join(__dirname, "../../drizzle");
  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of sqlFiles) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await client.exec(stmt);
    }
  }
});

afterAll(async () => {
  await client.close();
});

describe("schema migration", () => {
  it("creates all 9 expected tables", async () => {
    const res = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    const tables = res.rows.map((r) => r.table_name);
    expect(tables).toEqual(
      expect.arrayContaining([
        "accounts",
        "api_keys",
        "crawl_jobs",
        "crawl_snapshots",
        "scheduled_crawls",
        "sessions",
        "usage_events",
        "users",
        "verification_tokens",
      ])
    );
  });
});

describe("auth path (api_keys hash lookup)", () => {
  it("finds an active key by SHA-256 hash", async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ email: "ram@netleaf.org", name: "Ram" })
      .returning();

    const rawKey = "nl_test_secret_key_123";
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    await db.insert(schema.apiKeys).values({
      userId: user.id,
      name: "test key",
      keyHash,
      keyPrefix: rawKey.slice(0, 16),
    });

    // This is the EXACT query the auth middleware runs
    const found = await db.query.apiKeys.findFirst({
      where: and(
        eq(schema.apiKeys.keyHash, keyHash),
        eq(schema.apiKeys.isActive, true)
      ),
    });

    expect(found).toBeDefined();
    expect(found!.userId).toBe(user.id);
    expect(found!.name).toBe("test key");
  });

  it("does not find a revoked key", async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ email: "revoked@netleaf.org" })
      .returning();

    const keyHash = createHash("sha256").update("revoked_key").digest("hex");
    await db.insert(schema.apiKeys).values({
      userId: user.id,
      name: "revoked",
      keyHash,
      keyPrefix: "nl_revoked",
      isActive: false,
      revokedAt: new Date(),
    });

    const found = await db.query.apiKeys.findFirst({
      where: and(
        eq(schema.apiKeys.keyHash, keyHash),
        eq(schema.apiKeys.isActive, true)
      ),
    });
    expect(found).toBeUndefined();
  });

  it("enforces unique key_hash", async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ email: "dupe@netleaf.org" })
      .returning();
    const keyHash = createHash("sha256").update("dupe_key").digest("hex");
    await db.insert(schema.apiKeys).values({
      userId: user.id,
      name: "first",
      keyHash,
      keyPrefix: "nl_dupe",
    });
    await expect(
      db.insert(schema.apiKeys).values({
        userId: user.id,
        name: "second",
        keyHash,
        keyPrefix: "nl_dupe",
      })
    ).rejects.toThrow();
  });
});

describe("job store path (crawl_jobs round-trip)", () => {
  it("creates, updates pages, and reads back a crawl job", async () => {
    const jobId = "11111111-1111-1111-1111-111111111111";

    // createJobRecord
    await db.insert(schema.crawlJobs).values({
      id: jobId,
      status: "pending",
      startUrl: "https://example.com",
      options: { url: "https://example.com", maxPages: 10 },
      pages: [],
    });

    // worker: mark running
    await db
      .update(schema.crawlJobs)
      .set({ status: "running" })
      .where(eq(schema.crawlJobs.id, jobId));

    // worker: batch-write pages
    const pages = [
      { url: "https://example.com", markdown: "# Home", success: true },
      { url: "https://example.com/about", markdown: "# About", success: true },
    ];
    await db
      .update(schema.crawlJobs)
      .set({
        status: "completed",
        pages: pages as unknown[],
        totalFound: 2,
        totalScraped: 2,
        completedAt: new Date(),
      })
      .where(eq(schema.crawlJobs.id, jobId));

    // getJob
    const job = await db.query.crawlJobs.findFirst({
      where: eq(schema.crawlJobs.id, jobId),
    });

    expect(job).toBeDefined();
    expect(job!.status).toBe("completed");
    expect(job!.totalScraped).toBe(2);
    expect((job!.pages as typeof pages).length).toBe(2);
    expect((job!.pages as typeof pages)[1].url).toBe("https://example.com/about");
  });

  it("persists webhook_url and defaults webhook_sent to false", async () => {
    const jobId = "22222222-2222-2222-2222-222222222222";
    await db.insert(schema.crawlJobs).values({
      id: jobId,
      status: "pending",
      startUrl: "https://hook.test",
      options: {},
      webhookUrl: "https://my.webhook/cb",
    });
    const job = await db.query.crawlJobs.findFirst({
      where: eq(schema.crawlJobs.id, jobId),
    });
    expect(job!.webhookUrl).toBe("https://my.webhook/cb");
    expect(job!.webhookSent).toBe(false);
  });
});

describe("usage tracking path", () => {
  it("inserts a usage event with nullable api_key", async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ email: "usage@netleaf.org" })
      .returning();

    await db.insert(schema.usageEvents).values({
      userId: user.id,
      apiKeyId: null,
      endpoint: "/v1/scrape",
      pagesScraped: 1,
      statusCode: 200,
      durationMs: 432,
    });

    const events = await db.query.usageEvents.findMany({
      where: eq(schema.usageEvents.userId, user.id),
    });
    expect(events.length).toBe(1);
    expect(events[0].endpoint).toBe("/v1/scrape");
    expect(events[0].statusCode).toBe(200);
  });
});

describe("change detection path (crawl_snapshots)", () => {
  it("stores content hashes for crawled pages", async () => {
    const jobId = "33333333-3333-3333-3333-333333333333";
    await db.insert(schema.crawlJobs).values({
      id: jobId,
      status: "running",
      startUrl: "https://snap.test",
      options: {},
    });

    const markdown = "# Snapshot content";
    const hash = createHash("sha256").update(markdown).digest("hex");
    await db.insert(schema.crawlSnapshots).values({
      jobId,
      url: "https://snap.test",
      contentHash: hash,
      markdown,
    });

    const snaps = await db.query.crawlSnapshots.findMany({
      where: eq(schema.crawlSnapshots.jobId, jobId),
    });
    expect(snaps.length).toBe(1);
    expect(snaps[0].contentHash).toBe(hash);
  });
});

describe("scheduled crawls path", () => {
  it("stores a cron schedule with options", async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ email: "sched@netleaf.org" })
      .returning();

    await db.insert(schema.scheduledCrawls).values({
      userId: user.id,
      name: "nightly docs crawl",
      cronExpression: "0 2 * * *",
      options: { url: "https://docs.test", maxPages: 50 },
      nextRunAt: new Date("2030-01-01T02:00:00Z"),
    });

    const scheds = await db.query.scheduledCrawls.findMany({
      where: eq(schema.scheduledCrawls.userId, user.id),
    });
    expect(scheds.length).toBe(1);
    expect(scheds[0].cronExpression).toBe("0 2 * * *");
    expect(scheds[0].isActive).toBe(true);
  });
});

describe("cascade behavior", () => {
  it("cascades api_key deletion when user is deleted", async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ email: "cascade@netleaf.org" })
      .returning();
    await db.insert(schema.apiKeys).values({
      userId: user.id,
      name: "k",
      keyHash: createHash("sha256").update("cascade_key").digest("hex"),
      keyPrefix: "nl_cascade",
    });

    await db.delete(schema.users).where(eq(schema.users.id, user.id));

    const keys = await db.query.apiKeys.findMany({
      where: eq(schema.apiKeys.userId, user.id),
    });
    expect(keys.length).toBe(0);
  });
});
