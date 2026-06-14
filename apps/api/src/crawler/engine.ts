import { withPage } from "../scraper/browser.js";
import { scrapePage } from "../scraper/extract.js";
import { extractLinks, normalizeUrl, isAllowed } from "./parser.js";
import { CrawlOptions, ScrapeResult } from "../types/index.js";
import { config } from "../config/index.js";

export type ProgressCallback = (page: ScrapeResult, total: number) => void;

export async function crawl(
  options: CrawlOptions,
  onPage?: ProgressCallback
): Promise<ScrapeResult[]> {
  const maxPages = Math.min(options.maxPages ?? 25, config.maxCrawlPages);
  const maxDepth = options.maxDepth ?? 3;
  const excludePatterns = options.excludePatterns ?? [];
  const formats = options.formats ?? ["markdown"];

  const startUrl = normalizeUrl(options.url);
  const visited = new Set<string>([startUrl]);
  const results: ScrapeResult[] = [];

  // BFS queue: [url, depth]
  const queue: Array<[string, number]> = [[startUrl, 0]];

  while (queue.length > 0 && results.length < maxPages) {
    const [url, depth] = queue.shift()!;

    const result = await withPage(async (page) => {
      return scrapePage(page, { url, formats });
    });

    results.push(result);
    onPage?.(result, results.length);

    if (!result.success || depth >= maxDepth) continue;

    // Extract links from the raw HTML (we need to re-fetch or store html)
    if (result.html && results.length < maxPages) {
      const links = extractLinks(result.html, url);
      for (const link of links) {
        const normalized = normalizeUrl(link);
        if (
          !visited.has(normalized) &&
          isAllowed(normalized, excludePatterns) &&
          results.length + queue.length < maxPages
        ) {
          visited.add(normalized);
          queue.push([normalized, depth + 1]);
        }
      }
    }
  }

  return results;
}
