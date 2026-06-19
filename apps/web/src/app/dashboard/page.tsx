import { and, count, eq, gte } from "drizzle-orm";
import { getDb, usageEvents, crawlJobs, apiKeys } from "@/lib/db";
import { requireUserId } from "@/lib/session-guard";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { UsageChart, type UsagePoint } from "@/components/dashboard/UsageChart";

export const dynamic = "force-dynamic";

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default async function OverviewPage() {
  const userId = await requireUserId();
  const db = getDb();

  const since = new Date();
  since.setDate(since.getDate() - 13);

  const [events, [{ jobCount }], [{ keyCount }]] = await Promise.all([
    // Cap at 5000 rows — we only need per-day counts, not every individual event.
    // Without a limit a user making 100 req/min for 14 days = 2M+ rows loaded into memory.
    db
      .select()
      .from(usageEvents)
      .where(and(eq(usageEvents.userId, userId), gte(usageEvents.createdAt, since)))
      .limit(5000),
    // COUNT only — fetching all job rows (each with a JSONB pages column holding MB of
    // content) just to display a total count would OOM the web server for power users.
    db
      .select({ jobCount: count() })
      .from(crawlJobs)
      .where(eq(crawlJobs.userId, userId)),
    db
      .select({ keyCount: count() })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true))),
  ]);

  // Bucket usage by day
  const counts = new Map<string, number>();
  for (const e of events) {
    const day = (e.createdAt as Date).toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const chartData: UsagePoint[] = lastNDays(14).map((day) => ({
    date: day.slice(5),
    requests: counts.get(day) ?? 0,
  }));

  const totalPagesScraped = events.reduce((sum, e) => sum + (e.pagesScraped ?? 0), 0);
  const totalRequests = events.length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-ink-100">Your last 14 days of activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardTitle>Requests (14d)</CardTitle>
          <CardValue>{totalRequests}</CardValue>
        </Card>
        <Card>
          <CardTitle>Pages scraped (14d)</CardTitle>
          <CardValue>{totalPagesScraped}</CardValue>
        </Card>
        <Card>
          <CardTitle>Active API keys</CardTitle>
          <CardValue>{keyCount}</CardValue>
        </Card>
        <Card>
          <CardTitle>Total crawl jobs</CardTitle>
          <CardValue>{jobCount}</CardValue>
        </Card>
      </div>

      <Card>
        <CardTitle className="mb-4">Requests per day</CardTitle>
        <UsageChart data={chartData} />
      </Card>
    </div>
  );
}
