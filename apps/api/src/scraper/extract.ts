import { Page } from "playwright";
import { htmlToMarkdown, htmlToText, extractMetadata } from "./markdown.js";
import { ScrapeOptions, ScrapeResult } from "../types/index.js";
import { config } from "../config/index.js";
import { assertPublicUrl } from "../security/ssrf.js";

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

  try {
    // SSRF guard for the initial URL (the route interceptor covers redirects).
    await assertPublicUrl(options.url);

    const response = await page.goto(options.url, {
      waitUntil: "domcontentloaded",
      timeout,
    });

    statusCode = response?.status() ?? 200;

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 5000 }).catch(() => {});
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

    if (formats.includes("markdown")) result.markdown = cap(htmlToMarkdown(html));
    if (formats.includes("html")) result.html = cap(html);
    if (formats.includes("text")) result.text = cap(htmlToText(html));

    return result;
  } catch (err) {
    return {
      url: options.url,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      metadata: {
        statusCode,
        scrapedAt: new Date().toISOString(),
      },
    };
  }
}
