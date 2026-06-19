import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { getDb, crawlJobs } from "@/lib/db";
import { requireUserId } from "@/lib/session-guard";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "leaf" | "amber" | "red" | "muted"> = {
  completed: "leaf",
  running: "amber",
  pending: "muted",
  failed: "red",
};

export default async function CrawlsPage() {
  const userId = await requireUserId();
  const db = getDb();

  // Select only display columns — pages JSONB can be MBs per job; fetching all
  // columns for 50 jobs would pull potentially hundreds of MB into the web process.
  const jobs = await db
    .select({
      id: crawlJobs.id,
      startUrl: crawlJobs.startUrl,
      status: crawlJobs.status,
      totalScraped: crawlJobs.totalScraped,
      createdAt: crawlJobs.createdAt,
    })
    .from(crawlJobs)
    .where(eq(crawlJobs.userId, userId))
    .orderBy(desc(crawlJobs.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crawls</h1>
        <p className="mt-1 text-sm text-ink-100">Your 50 most recent crawl jobs.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        {jobs.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-100">No crawl jobs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-ink-900/60 text-left text-ink-100">
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Pages</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="max-w-xs truncate px-4 py-3 text-white">
                    <Link
                      href={`/dashboard/crawls/${job.id}`}
                      className="hover:text-leaf-300"
                    >
                      {job.startUrl}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[job.status] ?? "muted"}>{job.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-100">{job.totalScraped}</td>
                  <td className="px-4 py-3 text-ink-100">
                    {new Date(job.createdAt as Date).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/crawls/${job.id}`}
                      aria-label="View crawl details"
                      className="inline-flex text-ink-100/60 transition-colors hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
