import { Page } from "playwright";
import { htmlToMarkdown, htmlToText, extractMetadata } from "./markdown.js";
import { extractLinks } from "../crawler/parser.js";
import { ScrapeOptions, ScrapeResult } from "../types/index.js";
import { config } from "../config/index.js";
import { assertPublicUrl } from "../security/ssrf.js";

/**
 * E2-8: Playwright errors include full stack traces and `Call log:` blocks
 * with framework internals (selectors tried, waitUntil mode, navigation
 * states). Surfacing those to API clients leaks implementation detail and
 * is unhelpful UX. Strip everything after the first newline and remove the
 * "page.method: " prefix.
 */
function sanitizeScrapeError(err: unknown): string {
  if (!(err instanceof Error)) return "Unknown scrape error";
  const firstLine = err.message.split("\n", 1)[0].trim();
  // "page.goto: Timeout 30000ms exceeded." → "Timeout 30000ms exceeded."
  return firstLine.replace(/^(page|browser|context)\.[a-zA-Z_]+:\s*/, "");
}

// Hard cap on stored/returned content per format to bound memory + DB size.
const MAX_CONTENT_CHARS = parseInt(process.env.MAX_CONTENT_CHARS ?? "5000000", 10);

function cap(s: string): string {
  return s.length > MAX_CONTENT_CHARS ? s.slice(0, MAX_CONTENT_CHARS) : s;
}

export async function scrapePage(
  page: Page,
  options: ScrapeOptions
): Promise<ScrapeResult> {
  const formats = options.formats ?? ["markdown"];
  const timeout = options.timeout ?? config.defaultTimeoutMs;

  let statusCode = 200;
  const warnings: string[] = [];

  try {
    // SSRF guard for the initial URL (the route interceptor covers redirects).
    await assertPublicUrl(options.url);

    const response = await page.goto(options.url, {
      waitUntil: "domcontentloaded",
      timeout,
    });

    statusCode = response?.status() ?? 200;

    if (options.waitForSelector) {
      // A-1: don't swallow the timeout silently. If the selector never appears,
      // the page may be incomplete (e.g. a JS-rendered region didn't load) —
      // surface a warning so the caller knows rather than getting partial
      // content that looks successful.
      try {
        await page.waitForSelector(options.waitForSelector, { timeout: 5000 });
      } catch {
        warnings.push(
          `waitForSelector "${options.waitForSelector}" not found within 5s — returned content may be incomplete`
        );
      }
    }

    // Let JS hydrate
    await page.waitForTimeout(500);

    const html = await page.content();
    const meta = extractMetadata(html, options.url);

    const result: ScrapeResult = {
      url: options.url,
      success: true,
      metadata: {
        title: meta.title,
        description: meta.description,
        ogImage: meta.ogImage,
        language: meta.language,
        statusCode,
        scrapedAt: new Date().toISOString(),
      },
    };

    if (formats.includes("markdown")) result.markdown = cap(htmlToMarkdown(html, options.url));
    if (formats.includes("html")) result.html = cap(html);
    if (formats.includes("text")) result.text = cap(htmlToText(html));
    // E2-5: links is opt-in. extractLinks returns same-host http(s) links with
    // tracking params stripped (same helper the crawler uses).
    if (formats.includes("links")) result.links = extractLinks(html, options.url);

    if (warnings.length > 0) result.warnings = warnings;

    return result;
  } catch (err) {
    return {
      url: options.url,
      success: false,
      error: sanitizeScrapeError(err),
      metadata: {
        statusCode,
        scrapedAt: new Date().toISOString(),
      },
    };
  }
}
