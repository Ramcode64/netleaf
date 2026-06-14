import * as cheerio from "cheerio";
import { extractLinks } from "../crawler/parser.js";
import { safeFetch } from "../security/ssrf.js";

export interface MapOptions {
  url: string;
  includeSubdomains?: boolean;
  limit?: number;
}

export interface MapResult {
  links: string[];
  total: number;
  source: "sitemap" | "crawl";
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
const FETCH_TIMEOUT_MS = 10_000;

export async function mapSite(options: MapOptions): Promise<MapResult> {
  const { url, includeSubdomains = false, limit = DEFAULT_LIMIT } = options;
  const cap = Math.min(limit, MAX_LIMIT);
  const base = new URL(url);

  // 1. Try robots.txt for sitemap directives
  const sitemapUrls = await fetchSitemapUrlsFromRobots(base);

  if (sitemapUrls.length > 0) {
    const links = dedup(sitemapUrls, base, includeSubdomains, cap);
    if (links.length > 0) {
      return { links, total: links.length, source: "sitemap" };
    }
  }

  // 2. Try /sitemap.xml directly as fallback
  const directSitemapLinks = await fetchSitemapLinks(
    new URL("/sitemap.xml", base).toString()
  );
  if (directSitemapLinks.length > 0) {
    const links = dedup(directSitemapLinks, base, includeSubdomains, cap);
    if (links.length > 0) {
      return { links, total: links.length, source: "sitemap" };
    }
  }

  // 3. Fallback: fetch homepage, extract links via cheerio
  const homeLinks = await fetchPageLinks(url, base);
  const links = dedup(homeLinks, base, includeSubdomains, cap);
  return { links, total: links.length, source: "crawl" };
}

// --- robots.txt parsing ---

async function fetchSitemapUrlsFromRobots(base: URL): Promise<string[]> {
  const robotsUrl = new URL("/robots.txt", base).toString();
  try {
    const res = await timedFetch(robotsUrl);
    if (!res.ok) return [];
    const text = await res.text();
    const sitemapUrls: string[] = [];
    for (const line of text.split("\n")) {
      const match = line.match(/^Sitemap:\s*(.+)$/i);
      if (match) sitemapUrls.push(match[1].trim());
    }
    // Collect all links from all sitemap directives
    const allLinks: string[] = [];
    for (const sitemapUrl of sitemapUrls) {
      const links = await fetchSitemapLinks(sitemapUrl);
      allLinks.push(...links);
    }
    return allLinks;
  } catch {
    return [];
  }
}

// --- sitemap XML parsing (handles sitemap index + regular sitemaps, 1 level deep) ---

async function fetchSitemapLinks(sitemapUrl: string): Promise<string[]> {
  try {
    const res = await timedFetch(sitemapUrl);
    if (!res.ok) return [];
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    // Sitemap index — contains <sitemap><loc>…</loc></sitemap>
    const childSitemaps: string[] = [];
    $("sitemap > loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) childSitemaps.push(loc);
    });

    if (childSitemaps.length > 0) {
      // One level deep only
      const allLinks: string[] = [];
      await Promise.all(
        childSitemaps.slice(0, 20).map(async (childUrl) => {
          const links = await fetchSitemapLinks(childUrl);
          allLinks.push(...links);
        })
      );
      return allLinks;
    }

    // Regular sitemap — contains <url><loc>…</loc></url>
    const links: string[] = [];
    $("url > loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) links.push(loc);
    });
    return links;
  } catch {
    return [];
  }
}

// --- cheerio HTML link extraction ---

async function fetchPageLinks(url: string, base: URL): Promise<string[]> {
  try {
    const res = await timedFetch(url);
    if (!res.ok) return [];
    const html = await res.text();
    return extractLinks(html, base.toString());
  } catch {
    return [];
  }
}

// --- helpers ---

function dedup(
  urls: string[],
  base: URL,
  includeSubdomains: boolean,
  limit: number
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    if (result.length >= limit) break;
    try {
      const u = new URL(raw);
      // Normalise: strip trailing slash + fragment
      u.hash = "";
      const normalised = u.toString().replace(/\/$/, "");

      if (seen.has(normalised)) continue;

      const sameHost = u.hostname === base.hostname;
      const subdomain =
        includeSubdomains && u.hostname.endsWith(`.${base.hostname}`);

      if ((sameHost || subdomain) && (u.protocol === "http:" || u.protocol === "https:")) {
        seen.add(normalised);
        result.push(normalised);
      }
    } catch {
      // skip invalid URLs
    }
  }

  return result;
}

async function timedFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // safeFetch validates the host (and every redirect hop) against the SSRF
    // guard. robots.txt Sitemap: directives and sitemap-index <loc> entries can
    // point at arbitrary hosts, so this check is essential here.
    return await safeFetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Netleaf/1.0 (+https://netleaf.org/bot)" },
    });
  } finally {
    clearTimeout(timer);
  }
}
