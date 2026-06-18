import * as cheerio from "cheerio";
import { URL } from "url";
import { isSafeRegexPattern } from "../security/validators.js";

// Tracking parameters that change per-visit but never identify a unique page.
// Stripping them prevents the same page being crawled N times because the URL
// carries a fresh session ID, ad referrer, etc.
const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "msclkid", "mc_eid", "mc_cid",
  "ref", "ref_src", "ref_url", "_ga", "_gl",
]);

function canonicalizeUrl(u: URL): string {
  // Drop tracking-only params (they don't change page content), then sort the
  // remaining params so `?a=1&b=2` and `?b=2&a=1` dedupe to the same key.
  // Pagination/locale/facet params are PRESERVED so crawls find them all.
  const params = Array.from(u.searchParams.entries())
    .filter(([k]) => !TRACKING_PARAMS.has(k.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  u.search = "";
  for (const [k, v] of params) u.searchParams.append(k, v);
  u.hash = "";
  // Strip trailing slash on the path only — preserves query string when present
  const out = u.toString();
  return out.endsWith("/") && !out.endsWith("?/") ? out.replace(/\/$/, "") : out;
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, base);
      // Only same-host HTTP(S) links
      if (
        (resolved.protocol === "http:" || resolved.protocol === "https:") &&
        resolved.hostname === base.hostname
      ) {
        links.add(canonicalizeUrl(resolved));
      }
    } catch {
      // Invalid URL — skip
    }
  });

  return Array.from(links);
}

export function normalizeUrl(url: string): string {
  try {
    return canonicalizeUrl(new URL(url));
  } catch {
    return url;
  }
}

export function isAllowed(url: string, excludePatterns: string[]): boolean {
  return !excludePatterns.some((pattern) => {
    if (!isSafeRegexPattern(pattern)) {
      // Unsafe or invalid regex — fall back to plain substring match
      return url.includes(pattern);
    }
    return new RegExp(pattern).test(url);
  });
}
