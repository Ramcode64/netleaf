import { createHmac } from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client.js";
import { safeFetch } from "../security/ssrf.js";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;

// Full page content (markdown, html, text) is omitted from the webhook payload.
// A 500-page crawl with 5 MB per page would produce a 2.5 GB JSON body — OOM.
// Receivers that need content should poll GET /v1/crawl/:id after the event fires.
export interface WebhookPageSummary {
  url: string;
  title?: string;
  success: boolean;
  error?: string;
}

export interface WebhookPayload {
  jobId: string;
  status: "completed";
  pages: WebhookPageSummary[];
  totalScraped: number;
}

/**
 * Deliver a crawl-completion webhook with retry + exponential backoff.
 * Retries on BOTH network errors and non-2xx responses (up to MAX_ATTEMPTS).
 * Marks `webhookSent = true` on the job only after a 2xx response.
 *
 * Page summaries are loaded from crawl_pages (the child table) just-in-time.
 * For testing, pass an explicit `pages` array via `pagesOverride` to bypass DB
 * reads. `fetchImpl` is injectable for testing.
 */
export async function deliverWebhook(
  url: string,
  jobId: string,
  pagesOverride?: WebhookPageSummary[],
  // Defaults to safeFetch so webhook targets can't point at internal hosts
  // (SSRF). Tests inject their own impl to bypass the network entirely.
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = safeFetch
): Promise<boolean> {
  let summaries: WebhookPageSummary[];
  if (pagesOverride) {
    summaries = pagesOverride;
  } else {
    const db = getDb();
    // Stream summaries from crawl_pages. We only need 4 columns — full markdown
    // would explode the payload. Receivers needing content should poll
    // GET /v1/crawl/:id/pages?offset=&limit= after the event fires.
    const rows = await db
      .select({
        url: schema.crawlPages.url,
        title: schema.crawlPages.title,
        success: schema.crawlPages.success,
        error: schema.crawlPages.error,
      })
      .from(schema.crawlPages)
      .where(eq(schema.crawlPages.jobId, jobId))
      .orderBy(asc(schema.crawlPages.idx));
    summaries = rows.map((r) => ({
      url: r.url,
      title: r.title ?? undefined,
      success: r.success,
      error: r.error ?? undefined,
    }));
  }

  const payload: WebhookPayload = {
    jobId,
    status: "completed",
    pages: summaries,
    totalScraped: summaries.length,
  };
  const body = JSON.stringify(payload);

  const webhookSecret = process.env.WEBHOOK_SECRET;
  const signature = webhookSecret
    ? "sha256=" + createHmac("sha256", webhookSecret).update(body).digest("hex")
    : undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Netleaf/1.0 (+https://netleaf.org/bot)",
        "X-Netleaf-Event": "crawl.completed",
      };
      if (signature) headers["X-Netleaf-Signature"] = signature;

      const res = await fetchImpl(url, {
        method: "POST",
        headers,
        body,
      });

      if (res.ok) {
        await markSent(jobId);
        return true;
      }
      // Non-2xx — treat as retryable
    } catch {
      // Network error — retryable
    }

    // Back off before the next attempt (skip after the final attempt)
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BASE_BACKOFF_MS * (attempt + 1));
    }
  }

  return false;
}

async function markSent(jobId: string): Promise<void> {
  const db = getDb();
  // Conditional update: only flip false→true. Idempotent against concurrent
  // workers attempting delivery for the same jobId.
  await db
    .update(schema.crawlJobs)
    .set({ webhookSent: true })
    .where(and(eq(schema.crawlJobs.id, jobId), eq(schema.crawlJobs.webhookSent, false)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
