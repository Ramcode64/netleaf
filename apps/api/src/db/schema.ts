import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  bigserial,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  passwordHash: text("password_hash"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  googleId: text("google_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Auth.js v5 required tables
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const accounts = pgTable("accounts", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    keyHash: text("key_hash").unique().notNull(),
    keyPrefix: text("key_prefix").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    keyHashIdx: uniqueIndex("api_keys_key_hash_idx").on(table.keyHash),
    userIdIdx: index("api_keys_user_id_idx").on(table.userId),
  })
);

export const crawlJobs = pgTable(
  "crawl_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    startUrl: text("start_url").notNull(),
    options: jsonb("options").notNull(),
    totalFound: integer("total_found").default(0).notNull(),
    totalScraped: integer("total_scraped").default(0).notNull(),
    webhookUrl: text("webhook_url"),
    webhookSent: boolean("webhook_sent").default(false).notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    userIdCreatedAtIdx: index("crawl_jobs_user_id_created_at_idx").on(table.userId, table.createdAt),
    // Hot path: crawl creation + scheduler check both query
    // WHERE userId=? AND status IN ('pending','running')
    userIdStatusIdx: index("crawl_jobs_user_id_status_idx").on(table.userId, table.status),
  })
);

// Per-page rows for a crawl. Previously these were stored inline as a JSONB
// column on crawl_jobs — that meant a 500-page crawl rewrote a 2.5 GB row
// every 5 pages (~250 GB of WAL traffic) and loaded the entire payload into
// Node on every poll. Splitting into a child table makes per-page writes
// constant-time and enables pagination on the read side.
export const crawlPages = pgTable(
  "crawl_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id").references(() => crawlJobs.id, { onDelete: "cascade" }).notNull(),
    idx: integer("idx").notNull(),
    url: text("url").notNull(),
    success: boolean("success").default(true).notNull(),
    statusCode: integer("status_code"),
    title: text("title"),
    description: text("description"),
    markdown: text("markdown"),
    html: text("html"),
    text: text("text"),
    error: text("error"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Primary access pattern: WHERE job_id=? ORDER BY idx (pagination and export streaming).
    jobIdxIdx: index("crawl_pages_job_idx_idx").on(table.jobId, table.idx),
    // Idempotency: prevents accidental double-inserts of the same page on worker retries.
    jobIdxUnique: uniqueIndex("crawl_pages_job_idx_unique").on(table.jobId, table.idx),
  })
);

export const scheduledCrawls = pgTable(
  "scheduled_crawls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    cronExpression: text("cron_expression").notNull(),
    options: jsonb("options").notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nextRunIdx: index("scheduled_crawls_next_run_idx").on(table.nextRunAt),
    // T-4: list + count + ownership filters all key on user_id (schedule.ts
    // GET/PATCH/DELETE + the dashboard). Composite with created_at matches the
    // crawl_jobs index and serves the ORDER BY created_at DESC dashboard list.
    userIdIdx: index("scheduled_crawls_user_id_idx").on(table.userId, table.createdAt),
  })
);

export const crawlSnapshots = pgTable(
  "crawl_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id").references(() => crawlJobs.id, { onDelete: "cascade" }).notNull(),
    url: text("url").notNull(),
    contentHash: text("content_hash").notNull(),
    markdown: text("markdown"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    urlHashIdx: index("crawl_snapshots_url_hash_idx").on(table.url, table.contentHash),
  })
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    endpoint: text("endpoint").notNull(),
    pagesScraped: integer("pages_scraped").default(1).notNull(),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    apiKeyCreatedIdx: index("usage_events_api_key_created_idx").on(table.apiKeyId, table.createdAt),
    userCreatedIdx: index("usage_events_user_created_idx").on(table.userId, table.createdAt),
  })
);
