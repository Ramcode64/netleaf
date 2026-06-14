import * as cheerio from "cheerio";
import { URL } from "url";
import { isSafeRegexPattern } from "../security/validators.js";

export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, base);
      // Only same-host HTTP(S) links, no anchors
      if (
        (resolved.protocol === "http:" || resolved.protocol === "https:") &&
        resolved.hostname === base.hostname &&
        !resolved.hash
      ) {
        // Strip query params for dedup (keep clean URLs)
        resolved.search = "";
        resolved.hash = "";
        links.add(resolved.toString().replace(/\/$/, ""));
      }
    } catch {
      // Invalid URL — skip
    }
  });

  return Array.from(links);
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
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
