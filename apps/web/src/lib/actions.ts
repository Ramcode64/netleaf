"use server";

import { randomBytes, createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { getDb, apiKeys, scheduledCrawls } from "./db";

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

  const rawKey = `nl_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 16);

  const db = getDb();
  const [key] = await db
    .insert(apiKeys)
    .values({ userId, name: name.trim(), keyHash, keyPrefix })
    .returning({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix });

  revalidatePath("/dashboard/api-keys");
  return { id: key.id, name: key.name, rawKey, prefix: key.keyPrefix };
}

export async function revokeApiKey(id: string): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(apiKeys)
    .set({ isActive: false, revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
  revalidatePath("/dashboard/api-keys");
}

export async function deleteSchedule(id: string): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .delete(scheduledCrawls)
    .where(and(eq(scheduledCrawls.id, id), eq(scheduledCrawls.userId, userId)));
  revalidatePath("/dashboard/schedules");
}

export async function toggleSchedule(id: string, isActive: boolean): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(scheduledCrawls)
    .set({ isActive })
    .where(and(eq(scheduledCrawls.id, id), eq(scheduledCrawls.userId, userId)));
  revalidatePath("/dashboard/schedules");
}
