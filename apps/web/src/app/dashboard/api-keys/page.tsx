import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, apiKeys } from "@/lib/db";
import { ApiKeyManager, type KeyRow } from "@/components/dashboard/ApiKeyManager";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const db = getDb();

  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)));

  const keys: KeyRow[] = rows.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    createdAt: (k.createdAt as Date).toISOString(),
    lastUsedAt: k.lastUsedAt ? (k.lastUsedAt as Date).toISOString() : null,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="mt-1 text-sm text-ink-100">
          Use these to authenticate requests to the Netleaf API.
        </p>
      </div>
      <ApiKeyManager keys={keys} />
    </div>
  );
}
