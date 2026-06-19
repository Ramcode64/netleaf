import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDb, crawlJobs, crawlPages } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "leaf" | "amber" | "red" | "muted"> = {
  completed: "leaf",
  running: "amber",
  pending: "muted",
  failed: "red",
};

export default async function CrawlDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Defense-in-depth — also enforced by ownership predicate below, but rejecting
  // non-UUIDs early avoids a Postgres type-error 500.
  if (!z.string().uuid().safeParse(id).success) notFound();

  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const db = getDb();

  // Ownership baked into the SELECT — missing or other-user rows fall through to 404.
  const [job] = await db
    .select({
      id: crawlJobs.id,
      startUrl: crawlJobs.startUrl,
      status: crawlJobs.status,
      totalScraped: crawlJobs.totalScraped,
      totalFound: crawlJobs.totalFound,
      createdAt: crawlJobs.createdAt,
      completedAt: crawlJobs.completedAt,
      error: crawlJobs.error,
      webhookUrl: crawlJobs.webhookUrl,
      webhookSent: crawlJobs.webhookSent,
    })
    .from(crawlJobs)
    .where(and(eq(crawlJobs.id, id), eq(crawlJobs.userId, userId)))
    .limit(1);

  if (!job) notFound();

  // Page list — projection only (no full markdown/html) to keep the page snappy
  // even on a 500-row crawl. Click-through could load full content later if needed.
  const pages = await db
    .select({
      idx: crawlPages.idx,
      url: crawlPages.url,
      title: crawlPages.title,
      success: crawlPages.success,
      statusCode: crawlPages.statusCode,
      scrapedAt: crawlPages.scrapedAt,
    })
    .from(crawlPages)
    .where(eq(crawlPages.jobId, id))
    .orderBy(asc(crawlPages.idx))
    .limit(200);

  // Live API endpoint to hit for downloads. NEXT_PUBLIC_API_URL is set at build time;
  // on the showcase Vercel deploy it points to localhost so links resolve only when
  // an operator runs the API alongside.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/crawls"
        className="inline-flex items-center gap-1 text-xs text-ink-100 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3 w-3" /> Back to crawls
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-all text-2xl font-bold">{job.startUrl}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-100">
            <Badge tone={statusTone[job.status] ?? "muted"}>{job.status}</Badge>
            <span>
              {job.totalScraped}/{job.totalFound} pages
            </span>
            <span>Started {new Date(job.createdAt as Date).toLocaleString()}</span>
            {job.completedAt && (
              <span>Finished {new Date(job.completedAt as Date).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Hidden for failed jobs (nothing to export); disabled while pending
            (no pages yet). Running/completed allow partial export. */}
        {job.status !== "failed" && (
          <div className="flex flex-wrap items-center gap-2">
            <DownloadButton
              href={`${apiUrl}/v1/crawl/${id}/export?format=csv`}
              label="CSV"
              disabled={job.status === "pending"}
            />
            <DownloadButton
              href={`${apiUrl}/v1/crawl/${id}/export?format=xml`}
              label="XML"
              disabled={job.status === "pending"}
            />
            <DownloadButton
              href={`${apiUrl}/v1/crawl/${id}/export?format=zip`}
              label="ZIP"
              disabled={job.status === "pending"}
            />
          </div>
        )}
      </div>

      {job.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
          <p className="font-medium">Crawl failed</p>
          <p className="mt-1 break-words">{job.error}</p>
        </div>
      )}

      {job.webhookUrl && (
        <div className="rounded-xl border border-white/10 p-4 text-xs text-ink-100">
          <p className="font-medium text-white">Webhook</p>
          <p className="mt-1 break-all font-mono">{job.webhookUrl}</p>
          <p className="mt-1">{job.webhookSent ? "Delivered" : "Not delivered"}</p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">
          Pages {pages.length > 0 && <span className="text-ink-100/70">({pages.length} shown)</span>}
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-ink-100">
              <FileText className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                {job.status === "completed"
                  ? "This crawl returned no pages."
                  : "No pages scraped yet. Refresh to check progress."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-ink-900/60 text-left text-ink-100">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.idx} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-ink-100">{p.idx + 1}</td>
                    <td className="max-w-md break-all px-4 py-3 text-white">{p.url}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-ink-100">
                      {p.title ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.success ? (
                        <span className="text-leaf-300">{p.statusCode ?? "ok"}</span>
                      ) : (
                        <span className="text-red-300">{p.statusCode ?? "error"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {pages.length === 200 && (
          <p className="mt-2 text-xs text-ink-100/70">
            Showing first 200 pages. Use the API for paginated access.
          </p>
        )}
      </section>
    </div>
  );
}

function DownloadButton({
  href,
  label,
  disabled,
}: {
  href: string;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        title="No pages yet — wait for the crawl to produce results"
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/5 bg-ink-900/30 px-3 py-1.5 text-xs text-ink-100/40"
      >
        <Download className="h-3 w-3" /> {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-1.5 text-xs text-white transition-colors hover:border-leaf-500/40 hover:bg-leaf-500/5"
    >
      <Download className="h-3 w-3" /> {label}
    </a>
  );
}
