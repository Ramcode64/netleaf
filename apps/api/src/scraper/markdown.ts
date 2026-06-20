import TurndownService from "turndown";
import * as cheerio from "cheerio";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  hr: "---",
});

// Strip noisy elements before converting
const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "footer",
  "header",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  ".cookie-banner",
  ".ad",
  ".advertisement",
  "#cookie-notice",
];

export function htmlToMarkdown(html: string, baseUrl?: string): string {
  const $ = cheerio.load(html);

  REMOVE_SELECTORS.forEach((sel) => $(sel).remove());

  // Resolve relative hrefs/srcs to absolute URLs so the markdown is portable
  // and "AI-ready" — a link like (newest) or an image (logo.png) is useless
  // once the markdown leaves the page context. Skip if baseUrl is absent or
  // unparseable, and leave anchors/mailto/tel/data URIs alone.
  if (baseUrl) {
    let base: URL | null = null;
    try {
      base = new URL(baseUrl);
    } catch {
      base = null;
    }
    if (base) {
      const absolutize = (sel: string, attr: string) => {
        $(sel).each((_, el) => {
          const val = $(el).attr(attr);
          if (!val || /^(https?:|mailto:|tel:|data:|#)/i.test(val)) return;
          try {
            $(el).attr(attr, new URL(val, base!).toString());
          } catch {
            /* leave malformed values untouched */
          }
        });
      };
      absolutize("a[href]", "href");
      absolutize("img[src]", "src");
    }
  }

  // Prefer main content areas
  const mainContent =
    $("main").html() ||
    $("article").html() ||
    $('[role="main"]').html() ||
    $("body").html() ||
    html;

  return turndown.turndown(mainContent).trim();
}

export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  REMOVE_SELECTORS.forEach((sel) => $(sel).remove());
  return $("body").text().replace(/\s+/g, " ").trim();
}

export function extractMetadata(html: string, url: string): Record<string, string | undefined> {
  const $ = cheerio.load(html);
  return {
    title:
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content"),
    description:
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content"),
    ogImage: $('meta[property="og:image"]').attr("content"),
    language: $("html").attr("lang"),
  };
}
