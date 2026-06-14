import { describe, it, expect } from "vitest";
import { extractLinks, normalizeUrl, isAllowed } from "./parser.js";

const baseUrl = "https://example.com/blog";

const html = `
<html><body>
  <a href="/about">About</a>
  <a href="https://example.com/docs">Docs</a>
  <a href="https://other.com/page">External</a>
  <a href="#section">Anchor only</a>
  <a href="mailto:test@test.com">Email</a>
</body></html>
`;

describe("extractLinks", () => {
  it("extracts same-domain links", () => {
    const links = extractLinks(html, baseUrl);
    expect(links).toContain("https://example.com/about");
    expect(links).toContain("https://example.com/docs");
  });

  it("excludes external domains", () => {
    const links = extractLinks(html, baseUrl);
    expect(links.every((l) => l.includes("example.com"))).toBe(true);
  });

  it("excludes anchor-only links", () => {
    const links = extractLinks(html, baseUrl);
    expect(links).not.toContain("https://example.com/blog#section");
  });

  it("excludes mailto links", () => {
    const links = extractLinks(html, baseUrl);
    expect(links.every((l) => l.startsWith("http"))).toBe(true);
  });
});

describe("normalizeUrl", () => {
  it("strips trailing slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
  });

  it("strips hash fragment", () => {
    expect(normalizeUrl("https://example.com/page#top")).toBe("https://example.com/page");
  });
});

describe("isAllowed", () => {
  it("allows URLs not matching any pattern", () => {
    expect(isAllowed("https://example.com/blog", ["/admin"])).toBe(true);
  });

  it("blocks URLs matching a pattern", () => {
    expect(isAllowed("https://example.com/admin/users", ["/admin"])).toBe(false);
  });
});
