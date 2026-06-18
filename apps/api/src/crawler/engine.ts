import { withPage } from "../scraper/browser.js";
import { scrapePage } from "../scraper/extract.js";
import { extractLinks, normalizeUrl, isAllowed } from "./parser.js";
import { CrawlOptions, ScrapeResult } from "../types/index.js";
import { config } from "../config/index.js";

export type ProgressCallback = (page: ScrapeResult, total: number) => Promise<void> | void;

/**
 * BFS crawl with bounded intra-job parallelism.
 *
 * The previous implementation processed one URL at a time, so a single crawl
 * used at most 1 of `browserPoolSize` slots. Now up to `concurrency` page
 * fetches are in flight at once, matching the pool — a 100-page crawl is ~N×
 * faster where N = browserPoolSize.
 *
 * Invariants:
 *  - Page FETCHES are parallel (saturate the browser pool).
 *  - `onPage` callbacks are SERIAL. The worker uses a shared mutable counter
 *    to assign per-page row indices in `crawl_pages`; concurrent callbacks
 *    would race on that counter and collide on the unique (job_id, idx) index.
 *  - `maxPages` is strict: we never start a fetch that would exceed it.
 */
export async function crawl(
  options: CrawlOptions,
  onPage?: ProgressCallback
): Promise<ScrapeResult[]> {
  const maxPages = Math.min(options.maxPages ?? 25, config.maxCrawlPages);
  const maxDepth = options.maxDepth ?? 3;
  const excludePatterns = options.excludePatterns ?? [];
  const formats = options.formats ?? ["markdown"];
  // Cap parallelism at the browser pool size so we don't queue behind ourselves.
  // For a 1-page crawl, concurrency 1 is just as fast as concurrency N.
  const concurrency = Math.max(1, Math.min(config.browserPoolSize, maxPages));

  const startUrl = normalizeUrl(options.url);
  const visited = new Set<string>([startUrl]);
  const results: ScrapeResult[] = [];

  // BFS queue: [url, depth]
  const queue: Array<[string, number]> = [[startUrl, 0]];

  // Tagged in-flight promises. We need to know WHICH promise resolves on
  // Promise.race, plus the original url/depth so we can extract links from
  // its result after completion.
  type InFlight = {
    promise: Promise<{ url: string; depth: number; result: ScrapeResult }>;
  };
  const inFlight = new Set<InFlight>();

  const startFetch = (url: string, depth: number) => {
    const entry: InFlight = {
      promise: withPage((page) => scrapePage(page, { url, formats })).then((result) => ({
        url,
        depth,
        result,
      })),
    };
    inFlight.add(entry);
    return entry;
  };

  while (
    (queue.length > 0 || inFlight.size > 0) &&
    results.length < maxPages
  ) {
    // Fill up to concurrency slots, but never let started+completed exceed
    // maxPages — otherwise we'd waste a scrape that gets discarded.
    while (
      inFlight.size < concurrency &&
      queue.length > 0 &&
      results.length + inFlight.size < maxPages
    ) {
      const [url, depth] = queue.shift()!;
      startFetch(url, depth);
    }

    if (inFlight.size === 0) break;

    // Race for the next completion. Promise.race forwards rejection too —
    // if any scrape throws, the whole crawl fails (matches old behavior).
    const finished = await Promise.race(
      Array.from(inFlight).map((entry) =>
        entry.promise.then((value) => ({ entry, value }))
      )
    );
    inFlight.delete(finished.entry);

    const { result, depth, url } = finished.value;
    results.push(result);
    // Awaited so the worker's persistence keeps pace with the crawler.
    // Backpressure: a slow persistence path blocks the engine from
    // discovering pages faster than it can store them.
    await onPage?.(result, results.length);

    if (!result.success || depth >= maxDepth) continue;
    if (!result.html) continue;

    // Enqueue children. We bound the queue by maxPages so a viral crawl can't
    // discover millions of URLs and OOM the queue. visited tracks normalized
    // form so two paths to the same URL only enqueue once.
    const links = extractLinks(result.html, url);
    for (const link of links) {
      const normalized = normalizeUrl(link);
      if (
        !visited.has(normalized) &&
        isAllowed(normalized, excludePatterns) &&
        results.length + inFlight.size + queue.length < maxPages
      ) {
        visited.add(normalized);
        queue.push([normalized, depth + 1]);
      }
    }
  }

  return results;
}
