import { describe, it, expect, vi, afterEach } from "vitest";
import { search } from "./searchService.js";

vi.mock("../scraper/browser.js", () => ({
  withPage: vi.fn(async (fn: (page: unknown) => Promise<unknown>) => fn({})),
}));
vi.mock("../scraper/extract.js", () => ({
  scrapePage: vi.fn(),
}));
vi.mock("../config/index.js", () => ({
  config: { braveApiKey: "test-brave-key", defaultTimeoutMs: 30000 },
}));

import { scrapePage } from "../scraper/extract.js";

const BRAVE_RESPONSE = {
  web: {
    results: [
      { url: "https://example.com/1", title: "Result One", description: "Desc one" },
      { url: "https://example.com/2", title: "Result Two", description: "Desc two" },
      { url: "https://example.com/3", title: "Result Three", description: "Desc three" },
    ],
  },
};

function mockBrave(body = BRAVE_RESPONSE, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }))
  );
}

afterEach(() => vi.restoreAllMocks());

describe("search — no scrape", () => {
  it("returns Brave results without scraping", async () => {
    mockBrave();
    const result = await search({ query: "test query", scrape: false });

    expect(result.query).toBe("test query");
    expect(result.results).toHaveLength(3);
    expect(result.results[0].url).toBe("https://example.com/1");
    expect(result.results[0].title).toBe("Result One");
    expect(result.results[0].markdown).toBeUndefined();
  });

  it("respects maxResults cap", async () => {
    mockBrave();
    await search({ query: "test", maxResults: 2, scrape: false });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("count=2");
  });

  it("caps maxResults at 10 regardless of input", async () => {
    mockBrave();
    await search({ query: "test", maxResults: 99, scrape: false });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("count=10");
  });
});

describe("search — with scrape", () => {
  it("enriches results with markdown when scrape=true", async () => {
    mockBrave();
    vi.mocked(scrapePage).mockResolvedValue({
      url: "https://example.com/1",
      success: true,
      markdown: "# Result One content",
      metadata: { statusCode: 200, scrapedAt: new Date().toISOString() },
    });

    const result = await search({ query: "test", scrape: true, formats: ["markdown"] });

    expect(result.results[0].markdown).toBe("# Result One content");
  });

  it("keeps base result when scrape fails for a URL", async () => {
    mockBrave();
    vi.mocked(scrapePage).mockRejectedValue(new Error("Timeout"));

    const result = await search({ query: "test", scrape: true });

    expect(result.results).toHaveLength(3);
    expect(result.results[0].markdown).toBeUndefined();
    expect(result.results[0].title).toBe("Result One");
  });
});

describe("search — errors", () => {
  it("throws when BRAVE_API_KEY is missing", async () => {
    vi.resetModules();
    vi.doMock("../config/index.js", () => ({
      config: { braveApiKey: "", defaultTimeoutMs: 30000 },
    }));
    const { search: searchNoKey } = await import("./searchService.js");

    await expect(searchNoKey({ query: "test" })).rejects.toThrow("BRAVE_API_KEY");
  });

  it("throws on non-200 Brave API response", async () => {
    mockBrave({} as typeof BRAVE_RESPONSE, 429);
    await expect(search({ query: "test", scrape: false })).rejects.toThrow("429");
  });
});
