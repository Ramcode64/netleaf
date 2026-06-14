import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client.js";
import type { ScrapeResult } from "../types/index.js";
import { safeFetch } from "../security/ssrf.js";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;

export interface WebhookPayload {
  jobId: string;
  status: "completed";
  pages: ScrapeResult[];
  totalScraped: number;
}

/**
 * Deliver a crawl-completion webhook with retry + exponential backoff.
 * Retries on BOTH network errors and non-2xx responses (up to MAX_ATTEMPTS).
 * Marks `webhookSent = true` on the job only after a 2xx response.
 *
 * `fetchImpl` is injectable for testing.
 */
export async function deliverWebhook(
  url: string,
  jobId: string,
  pages: ScrapeResult[],
  // Defaults to safeFetch so webhook targets can't point at internal hosts
  // (SSRF). Tests inject their own impl to bypass the network entirely.
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = safeFetch
): Promise<boolean> {
  const payload: WebhookPayload = {
    jobId,
    status: "completed",
    pages,
    totalScraped: pages.length,
  };
  const body = JSON.stringify(payload);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Netleaf/1.0 (+https://netleaf.org/bot)",
          "X-Netleaf-Event": "crawl.completed",
        },
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
  await db
    .update(schema.crawlJobs)
    .set({ webhookSent: true })
    .where(eq(schema.crawlJobs.id, jobId));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
