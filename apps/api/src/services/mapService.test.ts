import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { mapSite } from "./mapService.js";

// All tests use a mocked fetch — no real network calls. The SSRF guard would
// otherwise do a real DNS lookup on the (mocked) hosts, so we run these unit
// tests in allow-private mode; SSRF behavior is covered in ssrf.test.ts.
beforeAll(() => {
  process.env.ALLOW_PRIVATE_IPS = "true";
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(responses: Record<string, { ok: boolean; body: string }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const entry = responses[url];
      if (!entry) return { ok: false, text: async () => "" } as Response;
      return {
        ok: entry.ok,
        text: async () => entry.body,
      } as Response;
    })
  );
}

const HOME_HTML = `
  <html><body>
    <a href="/about">About</a>
    <a href="/blog">Blog</a>
    <a href="https://example.com/contact">Contact</a>
    <a href="https://other.com/page">External</a>
  </body></html>
`;

const SITEMAP_XML = `
  <?xml version="1.0"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/</loc></url>
    <url><loc>https://example.com/about</loc></url>
    <url><loc>https://example.com/blog</loc></url>
    <url><loc>https://example.com/contact</loc></url>
  </urlset>
`;

const SITEMAP_INDEX_XML = `
  <?xml version="1.0"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
    <sitemap><loc>https://example.com/sitemap-blog.xml</loc></sitemap>
  </sitemapindex>
`;

const SITEMAP_PAGES_XML = `
  <?xml version="1.0"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/</loc></url>
    <url><loc>https://example.com/about</loc></url>
  </urlset>
`;

const SITEMAP_BLOG_XML = `
  <?xml version="1.0"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/blog/post-1</loc></url>
    <url><loc>https://example.com/blog/post-2</loc></url>
  </urlset>
`;

const ROBOTS_WITH_SITEMAP = `
User-agent: *
Disallow: /admin
Sitemap: https://example.com/sitemap.xml
`;

const ROBOTS_WITH_INDEX = `
User-agent: *
Disallow: /admin
Sitemap: https://example.com/sitemap-index.xml
`;

const ROBOTS_EMPTY = `User-agent: *\nDisallow: /private\n`;

describe("mapSite — robots.txt → sitemap path", () => {
  it("extracts links from sitemap listed in robots.txt", async () => {
    mockFetch({
      "https://example.com/robots.txt": { ok: true, body: ROBOTS_WITH_SITEMAP },
      "https://example.com/sitemap.xml": { ok: true, body: SITEMAP_XML },
    });

    const result = await mapSite({ url: "https://example.com" });

    expect(result.source).toBe("sitemap");
    expect(result.links).toContain("https://example.com/about");
    expect(result.links).toContain("https://example.com/blog");
    expect(result.total).toBeGreaterThan(0);
  });

  it("handles sitemap index — fetches child sitemaps one level deep", async () => {
    mockFetch({
      "https://example.com/robots.txt": { ok: true, body: ROBOTS_WITH_INDEX },
      "https://example.com/sitemap-index.xml": { ok: true, body: SITEMAP_INDEX_XML },
      "https://example.com/sitemap-pages.xml": { ok: true, body: SITEMAP_PAGES_XML },
      "https://example.com/sitemap-blog.xml": { ok: true, body: SITEMAP_BLOG_XML },
    });

    const result = await mapSite({ url: "https://example.com" });

    expect(result.source).toBe("sitemap");
    expect(result.links).toContain("https://example.com/about");
    expect(result.links).toContain("https://example.com/blog/post-1");
    expect(result.links).toContain("https://example.com/blog/post-2");
  });
});

describe("mapSite — direct /sitemap.xml fallback", () => {
  it("falls back to /sitemap.xml when robots.txt has no Sitemap directive", async () => {
    mockFetch({
      "https://example.com/robots.txt": { ok: true, body: ROBOTS_EMPTY },
      "https://example.com/sitemap.xml": { ok: true, body: SITEMAP_XML },
    });

    const result = await mapSite({ url: "https://example.com" });

    expect(result.source).toBe("sitemap");
    expect(result.links).toContain("https://example.com/about");
  });
});

describe("mapSite — HTML crawl fallback", () => {
  it("falls back to homepage link extraction when no sitemap exists", async () => {
    mockFetch({
      "https://example.com/robots.txt": { ok: false, body: "" },
      "https://example.com/sitemap.xml": { ok: false, body: "" },
      "https://example.com/": { ok: true, body: HOME_HTML },
    });

    const result = await mapSite({ url: "https://example.com" });

    expect(result.source).toBe("crawl");
    expect(result.links).toContain("https://example.com/about");
    expect(result.links).toContain("https://example.com/blog");
    // External link should NOT appear
    expect(result.links).not.toContain("https://other.com/page");
  });
});

describe("mapSite — dedup and limit", () => {
  it("deduplicates links across sitemap entries", async () => {
    const duplicateSitemap = `
      <?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/about</loc></url>
        <url><loc>https://example.com/about</loc></url>
        <url><loc>https://example.com/about/</loc></url>
      </urlset>
    `;
    mockFetch({
      "https://example.com/robots.txt": { ok: true, body: ROBOTS_WITH_SITEMAP },
      "https://example.com/sitemap.xml": { ok: true, body: duplicateSitemap },
    });

    const result = await mapSite({ url: "https://example.com" });

    const aboutCount = result.links.filter((l) => l.includes("/about")).length;
    expect(aboutCount).toBe(1);
  });

  it("respects the limit option", async () => {
    mockFetch({
      "https://example.com/robots.txt": { ok: true, body: ROBOTS_WITH_SITEMAP },
      "https://example.com/sitemap.xml": { ok: true, body: SITEMAP_XML },
    });

    const result = await mapSite({ url: "https://example.com", limit: 2 });

    expect(result.links.length).toBeLessThanOrEqual(2);
    expect(result.total).toBeLessThanOrEqual(2);
  });

  it("caps limit at 1000 even if higher value is passed", async () => {
    mockFetch({
      "https://example.com/robots.txt": { ok: false, body: "" },
      "https://example.com/sitemap.xml": { ok: false, body: "" },
      "https://example.com/": { ok: true, body: HOME_HTML },
    });

    // Should not throw; just caps at 1000 internally
    const result = await mapSite({ url: "https://example.com", limit: 99999 });
    expect(result.links.length).toBeLessThanOrEqual(1000);
  });
});

describe("mapSite — subdomain filter", () => {
  it("excludes subdomains by default", async () => {
    const sitemapWithSubdomain = `
      <?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/page</loc></url>
        <url><loc>https://blog.example.com/post</loc></url>
      </urlset>
    `;
    mockFetch({
      "https://example.com/robots.txt": { ok: true, body: ROBOTS_WITH_SITEMAP },
      "https://example.com/sitemap.xml": { ok: true, body: sitemapWithSubdomain },
    });

    const result = await mapSite({ url: "https://example.com" });

    expect(result.links).not.toContain("https://blog.example.com/post");
    expect(result.links).toContain("https://example.com/page");
  });

  it("includes subdomains when includeSubdomains is true", async () => {
    const sitemapWithSubdomain = `
      <?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/page</loc></url>
        <url><loc>https://blog.example.com/post</loc></url>
      </urlset>
    `;
    mockFetch({
      "https://example.com/robots.txt": { ok: true, body: ROBOTS_WITH_SITEMAP },
      "https://example.com/sitemap.xml": { ok: true, body: sitemapWithSubdomain },
    });

    const result = await mapSite({ url: "https://example.com", includeSubdomains: true });

    expect(result.links).toContain("https://blog.example.com/post");
    expect(result.links).toContain("https://example.com/page");
  });
});

describe("mapSite — error resilience", () => {
  it("returns empty crawl result when all fetches fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("Network error"); }));

    const result = await mapSite({ url: "https://example.com" });

    expect(result.links).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.source).toBe("crawl");
  });
});
