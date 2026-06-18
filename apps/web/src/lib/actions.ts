"use server";

import { randomBytes, createHash } from "crypto";
import { createRequire } from "module";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { getDb, apiKeys, scheduledCrawls } from "./db";

// cron-parser is CJS; use the same shim pattern as apps/api so it works under
// Next.js's ESM build without bringing the whole library through Webpack.
const cronRequire = createRequire(import.meta.url);
const cronParser = cronRequire("cron-parser") as {
  parseExpression: (expr: string, opts?: object) => { next(): { toDate(): Date } };
};

function computeNextRun(cronExpression: string, after = new Date()): Date {
  const interval = cronParser.parseExpression(cronExpression, { currentDate: after });
  return interval.next().toDate();
}

const uuidSchema = z.string().uuid();

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export interface CreatedKey {
  id: string;
  name: string;
  rawKey: string;
  prefix: string;
}

/** Create an API key. Returns the raw key ONCE — only the hash is stored. */
export async function createApiKey(name: string): Promise<CreatedKey> {
  const userId = await requireUserId();
  if (!name.trim()) throw new Error("Name is required");
  if (name.trim().length > 100) throw new Error("Name must be at most 100 characters");

  const db = getDb();

  const existing = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)));
  if (existing.length >= 10) throw new Error("Maximum of 10 active API keys allowed");

  const rawKey = `nl_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 16);

  const [key] = await db
    .insert(apiKeys)
    .values({ userId, name: name.trim(), keyHash, keyPrefix })
    .returning({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix });

  revalidatePath("/dashboard/api-keys");
  return { id: key.id, name: key.name, rawKey, prefix: key.keyPrefix };
}

export async function revokeApiKey(id: string): Promise<void> {
  if (!uuidSchema.safeParse(id).success) return;
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(apiKeys)
    .set({ isActive: false, revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
  revalidatePath("/dashboard/api-keys");
}

const CreateScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  cronExpression: z.string().min(1).max(120),
  url: z.string().url().refine((u) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "url must be http(s)"),
  maxPages: z.coerce.number().int().min(1).max(1000).default(100),
  webhookUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export interface CreateScheduleInput {
  name: string;
  cronExpression: string;
  url: string;
  maxPages?: number | string;
  webhookUrl?: string;
}

/**
 * Create a scheduled crawl from the dashboard. Validates inputs, computes
 * nextRunAt from the cron expression, and inserts into the same scheduledCrawls
 * table that the API's scheduler service polls. Per-user cap of 20 matches
 * the API route.
 */
export async function createSchedule(
  input: CreateScheduleInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = CreateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { name, cronExpression, url, maxPages, webhookUrl } = parsed.data;

  let nextRunAt: Date;
  try {
    nextRunAt = computeNextRun(cronExpression);
  } catch {
    return {
      ok: false,
      error: "Invalid cron expression. Try `0 8 * * *` (8am daily) or use crontab.guru.",
    };
  }

  const db = getDb();

  // Per-user cap matches the API route. Concurrent creates can race past
  // this check, but the impact is bounded (extra 1-2 schedules at worst).
  const existing = await db
    .select({ id: scheduledCrawls.id })
    .from(scheduledCrawls)
    .where(eq(scheduledCrawls.userId, userId));
  if (existing.length >= 20) {
    return { ok: false, error: "Maximum of 20 schedules per user reached." };
  }

  const [row] = await db
    .insert(scheduledCrawls)
    .values({
      userId,
      name,
      cronExpression,
      nextRunAt,
      isActive: true,
      options: {
        url,
        maxPages,
        ...(webhookUrl ? { webhookUrl } : {}),
      },
    })
    .returning({ id: scheduledCrawls.id });

  revalidatePath("/dashboard/schedules");
  return { ok: true, id: row.id };
}

export async function deleteSchedule(id: string): Promise<void> {
  if (!uuidSchema.safeParse(id).success) return;
  const userId = await requireUserId();
  const db = getDb();
  await db
    .delete(scheduledCrawls)
    .where(and(eq(scheduledCrawls.id, id), eq(scheduledCrawls.userId, userId)));
  revalidatePath("/dashboard/schedules");
}

export async function toggleSchedule(id: string, isActive: boolean): Promise<void> {
  if (!uuidSchema.safeParse(id).success) return;
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(scheduledCrawls)
    .set({ isActive })
    .where(and(eq(scheduledCrawls.id, id), eq(scheduledCrawls.userId, userId)));
  revalidatePath("/dashboard/schedules");
}
