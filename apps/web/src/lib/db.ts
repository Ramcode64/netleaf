import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  bigserial,
} from "drizzle-orm/pg-core";

/**
 * Web-side schema subset. Mirrors the tables defined in apps/api/src/db/schema.ts
 * that the dashboard reads/writes. The API owns migrations; this is read/write
 * access over the same PostgreSQL instance using the session userId.
 */

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

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").unique().notNull(),
  keyPrefix: text("key_prefix").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const crawlJobs = pgTable("crawl_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  apiKeyId: uuid("api_key_id"),
  userId: uuid("user_id"),
  status: text("status").notNull().default("pending"),
  startUrl: text("start_url").notNull(),
  options: jsonb("options").notNull(),
  pages: jsonb("pages").default([]).notNull(),
  totalFound: integer("total_found").default(0).notNull(),
  totalScraped: integer("total_scraped").default(0).notNull(),
  webhookUrl: text("webhook_url"),
  webhookSent: boolean("webhook_sent").default(false).notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const scheduledCrawls = pgTable("scheduled_crawls", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  apiKeyId: uuid("api_key_id"),
  name: text("name").notNull(),
  cronExpression: text("cron_expression").notNull(),
  options: jsonb("options").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usageEvents = pgTable("usage_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  apiKeyId: uuid("api_key_id"),
  userId: uuid("user_id"),
  endpoint: text("endpoint").notNull(),
  pagesScraped: integer("pages_scraped").default(1).notNull(),
  statusCode: integer("status_code"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const schema = { users, apiKeys, crawlJobs, scheduledCrawls, usageEvents };

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const sql = postgres(url, { max: 5 });
    _db = drizzle(sql, { schema });
  }
  return _db;
}
