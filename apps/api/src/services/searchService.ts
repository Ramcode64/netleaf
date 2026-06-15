import { config } from "../config/index.js";
import { withPage } from "../scraper/browser.js";
import { scrapePage } from "../scraper/extract.js";
import { ScrapeFormat } from "../types/index.js";

export interface SearchOptions {
  query: string;
  maxResults?: number;
  scrape?: boolean;
  formats?: ScrapeFormat[];
}

export interface SearchResultItem {
  url: string;
  title: string;
  description: string;
  markdown?: string;
  html?: string;
  text?: string;
}

export interface SearchResult {
  results: SearchResultItem[];
  total: number;
  query: string;
}

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const MAX_RESULTS_CAP = 10;
const FETCH_TIMEOUT_MS = 10_000;

interface BraveWebResult {
  url: string;
  title: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

export async function search(options: SearchOptions): Promise<SearchResult> {
  if (!config.braveApiKey) {
    // Message intentionally avoids the env var name — it's surfaced to clients
    // in the search route error handler.
    throw new Error("Brave Search is not configured on this server.");
  }

  const count = Math.min(options.maxResults ?? 5, MAX_RESULTS_CAP);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let braveRes: Response;
  try {
    braveRes = await fetch(
      `${BRAVE_SEARCH_URL}?q=${encodeURIComponent(options.query)}&count=${count}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": config.braveApiKey,
        },
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!braveRes.ok) {
    const body = await braveRes.text().catch(() => "");
    throw new Error(`Brave Search API error (${braveRes.status}): ${body}`);
  }

  const data = (await braveRes.json()) as BraveSearchResponse;
  const webResults = data.web?.results ?? [];

  const baseItems: SearchResultItem[] = webResults.map((r) => ({
    url: r.url,
    title: r.title,
    description: r.description ?? "",
  }));

  if (!options.scrape) {
    return { results: baseItems, total: baseItems.length, query: options.query };
  }

  // Scrape all results in parallel using the browser pool
  const formats = options.formats ?? (["markdown"] as ScrapeFormat[]);
  const scraped = await Promise.allSettled(
    baseItems.map((item) =>
      withPage((page) => scrapePage(page, { url: item.url, formats }))
    )
  );

  const results: SearchResultItem[] = baseItems.map((item, i) => {
    const outcome = scraped[i];
    if (outcome.status === "fulfilled" && outcome.value.success) {
      return {
        ...item,
        markdown: outcome.value.markdown,
        html: outcome.value.html,
        text: outcome.value.text,
      };
    }
    return item;
  });

  return { results, total: results.length, query: options.query };
}
