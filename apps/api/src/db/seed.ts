import { createHash } from "crypto";
import { config } from "../config/index.js";
import { getDb, schema } from "./client.js";
import { LOCAL_USER_ID } from "../api/middleware/auth.js";

/**
 * Idempotently seed the nil-UUID virtual user that LOCAL_MODE assigns to
 * every request. Without this row, every crawl_jobs / scheduled_crawls
 * INSERT trips the FK constraint and returns 500. Must run before the API
 * accepts requests.
 */
export async function seedLocalUser(): Promise<void> {
  if (process.env.LOCAL_MODE !== "true") return;
  const db = getDb();
  await db
    .insert(schema.users)
    .values({
      id: LOCAL_USER_ID,
      email: "local@netleaf.local",
      name: "Local mode",
      emailVerified: true,
    })
    .onConflictDoNothing();
}

export async function seedLegacyKeys(): Promise<void> {
  if (!config.legacyApiKeys) return;

  const db = getDb();
  const existing = await db.query.apiKeys.findFirst();
  if (existing) return; // already seeded

  const legacyUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, "legacy@netleaf.internal"),
  });

  let userId: string;
  if (!legacyUser) {
    const [user] = await db
      .insert(schema.users)
      .values({
        email: "legacy@netleaf.internal",
        name: "Legacy (migrated)",
        emailVerified: true,
      })
      .returning({ id: schema.users.id });
    userId = user.id;
  } else {
    userId = legacyUser.id;
  }

  const keys = config.legacyApiKeys.split(",").map((k) => k.trim()).filter(Boolean);
  for (const rawKey of keys) {
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    await db.insert(schema.apiKeys).values({
      userId,
      name: "Migrated key",
      keyHash,
      keyPrefix: rawKey.slice(0, 16),
    }).onConflictDoNothing();
  }

  console.log(`Migrated ${keys.length} legacy API key(s) to database`);
}
