import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractFromUrl, ExtractError } from "./index.js";

// When tests use vi.resetModules() + dynamic import, the ExtractError class
// from the re-imported module is a different object than the static import.
// Use this helper to check by name+property instead of instanceof.
function isExtractError(err: unknown): err is { name: string; statusCode: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "ExtractError"
  );
}

// ---------------------------------------------------------------------------
// Mock the browser/scraper so no Playwright needed
// ---------------------------------------------------------------------------
vi.mock("../../scraper/browser.js", () => ({
  withPage: vi.fn(async (fn: (page: unknown) => Promise<unknown>) =>
    fn({})
  ),
}));

vi.mock("../../scraper/extract.js", () => ({
  scrapePage: vi.fn(),
}));

// Mock all three providers
vi.mock("./providers/claude.js", () => ({
  ClaudeProvider: vi.fn(),
}));
vi.mock("./providers/openai.js", () => ({
  OpenAIProvider: vi.fn(),
}));
vi.mock("./providers/ollama.js", () => ({
  OllamaProvider: vi.fn(),
}));

import { scrapePage } from "../../scraper/extract.js";
import { ClaudeProvider } from "./providers/claude.js";
import { OpenAIProvider } from "./providers/openai.js";
import { OllamaProvider } from "./providers/ollama.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SIMPLE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    price: { type: "number" },
  },
  required: ["title", "price"],
  additionalProperties: false,
};

const VALID_DATA = { title: "Widget", price: 9.99 };
const INVALID_DATA = { title: "Widget" }; // missing price

function makeScrapeMock(markdown = "Page content about Widget at $9.99") {
  vi.mocked(scrapePage).mockResolvedValue({
    url: "https://example.com",
    success: true,
    markdown,
    metadata: { statusCode: 200, scrapedAt: new Date().toISOString() },
  });
}

function makeProvider(
  name: string,
  configured: boolean,
  extractImpl: () => Promise<unknown>
) {
  return { name, isConfigured: () => configured, extract: vi.fn(extractImpl) };
}

// ---------------------------------------------------------------------------
// Reset selectChain by controlling provider instances
// We intercept the module-level singleton construction via constructor mocks.
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractFromUrl — schema validation", () => {
  it("throws 400 for invalid JSON Schema", async () => {
    const err = await extractFromUrl({
      url: "https://example.com",
      schema: { type: "not-a-valid-type" } as never,
      provider: "ollama",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(ExtractError);
    expect((err as ExtractError).statusCode).toBe(400);
  });
});

describe("extractFromUrl — provider selection", () => {
  it("throws 400 for unknown provider name", async () => {
    const err = await extractFromUrl({
      url: "https://example.com",
      schema: SIMPLE_SCHEMA,
      provider: "unknown-llm" as never,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(ExtractError);
    expect((err as ExtractError).statusCode).toBe(400);
    expect((err as ExtractError).message).toMatch(/Unknown provider/);
  });
});

describe("extractFromUrl — scrape failure", () => {
  it("throws 422 when scrape fails", async () => {
    vi.mocked(scrapePage).mockResolvedValue({
      url: "https://example.com",
      success: false,
      error: "Connection refused",
      metadata: { statusCode: 0, scrapedAt: new Date().toISOString() },
    });

    // Give Ollama a working extract so it's not the failure point
    vi.mocked(OllamaProvider).mockImplementation(
      () => makeProvider("ollama", true, async () => VALID_DATA) as never
    );
    vi.mocked(ClaudeProvider).mockImplementation(
      () => makeProvider("claude", false, async () => {}) as never
    );
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", false, async () => {}) as never
    );

    // Re-import after mocks are set
    const { extractFromUrl: extract } = await import("./index.js");

    const err = await extract({
      url: "https://example.com",
      schema: SIMPLE_SCHEMA,
    }).catch((e) => e);

    expect(isExtractError(err)).toBe(true);
    expect((err as ExtractError).statusCode).toBe(422);
  });
});

describe("extractFromUrl — auto-chain (Claude → OpenAI → Ollama)", () => {
  it("uses first configured provider and returns valid data", async () => {
    makeScrapeMock();

    const claudeExtract = vi.fn(async () => VALID_DATA);
    vi.mocked(ClaudeProvider).mockImplementation(
      () => makeProvider("claude", true, claudeExtract) as never
    );
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", false, async () => {}) as never
    );
    vi.mocked(OllamaProvider).mockImplementation(
      () => makeProvider("ollama", true, async () => {}) as never
    );

    const { extractFromUrl: extract } = await import("./index.js");

    const result = await extract({ url: "https://example.com", schema: SIMPLE_SCHEMA });

    expect(result.provider).toBe("claude");
    expect(result.extracted).toEqual(VALID_DATA);
    expect(claudeExtract).toHaveBeenCalledTimes(1);
  });

  it("falls through to next provider when first fails", async () => {
    makeScrapeMock();

    vi.mocked(ClaudeProvider).mockImplementation(
      () =>
        makeProvider("claude", true, async () => {
          throw new Error("API rate limit");
        }) as never
    );
    const openaiExtract = vi.fn(async () => VALID_DATA);
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", true, openaiExtract) as never
    );
    vi.mocked(OllamaProvider).mockImplementation(
      () => makeProvider("ollama", true, async () => {}) as never
    );

    const { extractFromUrl: extract } = await import("./index.js");

    const result = await extract({ url: "https://example.com", schema: SIMPLE_SCHEMA });

    expect(result.provider).toBe("openai");
    expect(result.extracted).toEqual(VALID_DATA);
  });

  it("throws 502 when all auto-chain providers fail", async () => {
    makeScrapeMock();

    const fail = async () => { throw new Error("unavailable"); };
    vi.mocked(ClaudeProvider).mockImplementation(
      () => makeProvider("claude", true, fail) as never
    );
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", true, fail) as never
    );
    vi.mocked(OllamaProvider).mockImplementation(
      () => makeProvider("ollama", true, fail) as never
    );

    const { extractFromUrl: extract } = await import("./index.js");

    const err = await extract({ url: "https://example.com", schema: SIMPLE_SCHEMA }).catch((e) => e);

    expect(isExtractError(err)).toBe(true);
    expect((err as ExtractError).statusCode).toBe(502);
    expect((err as ExtractError).message).toMatch(/All providers failed/);
  });
});

describe("extractFromUrl — explicit provider mode", () => {
  it("uses the named provider and does NOT fall through on failure", async () => {
    makeScrapeMock();

    vi.mocked(OllamaProvider).mockImplementation(
      () =>
        makeProvider("ollama", true, async () => {
          throw new Error("Ollama not running");
        }) as never
    );
    const claudeExtract = vi.fn(async () => VALID_DATA);
    vi.mocked(ClaudeProvider).mockImplementation(
      () => makeProvider("claude", true, claudeExtract) as never
    );
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", true, async () => VALID_DATA) as never
    );

    const { extractFromUrl: extract } = await import("./index.js");

    const err = await extract({
      url: "https://example.com",
      schema: SIMPLE_SCHEMA,
      provider: "ollama",
    }).catch((e) => e);

    // Hard-fail — should NOT have tried Claude or OpenAI
    expect(isExtractError(err)).toBe(true);
    expect((err as ExtractError).statusCode).toBe(502);
    expect(claudeExtract).not.toHaveBeenCalled();
  });

  it("succeeds with explicit provider when it works", async () => {
    makeScrapeMock();

    const ollamaExtract = vi.fn(async () => VALID_DATA);
    vi.mocked(OllamaProvider).mockImplementation(
      () => makeProvider("ollama", true, ollamaExtract) as never
    );
    vi.mocked(ClaudeProvider).mockImplementation(
      () => makeProvider("claude", false, async () => {}) as never
    );
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", false, async () => {}) as never
    );

    const { extractFromUrl: extract } = await import("./index.js");

    const result = await extract({
      url: "https://example.com",
      schema: SIMPLE_SCHEMA,
      provider: "ollama",
    });

    expect(result.provider).toBe("ollama");
    expect(result.extracted).toEqual(VALID_DATA);
  });
});

describe("extractFromUrl — repair retry", () => {
  it("retries once with repairContext when output fails validation", async () => {
    makeScrapeMock();

    const extractFn = vi
      .fn()
      .mockResolvedValueOnce(INVALID_DATA)  // first attempt: missing price
      .mockResolvedValueOnce(VALID_DATA);   // repair attempt: corrected

    vi.mocked(ClaudeProvider).mockImplementation(
      () => makeProvider("claude", true, extractFn) as never
    );
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", false, async () => {}) as never
    );
    vi.mocked(OllamaProvider).mockImplementation(
      () => makeProvider("ollama", true, async () => {}) as never
    );

    const { extractFromUrl: extract } = await import("./index.js");

    const result = await extract({ url: "https://example.com", schema: SIMPLE_SCHEMA });

    expect(result.extracted).toEqual(VALID_DATA);
    expect(extractFn).toHaveBeenCalledTimes(2);
    // Second call should have repairContext set
    const secondCall = extractFn.mock.calls[1][0] as { repairContext?: string };
    expect(secondCall.repairContext).toBeTruthy();
  });

  it("fails provider after both attempts return invalid data", async () => {
    makeScrapeMock();

    // Both attempts return invalid schema-non-conforming data
    vi.mocked(ClaudeProvider).mockImplementation(
      () =>
        makeProvider("claude", true, async () => INVALID_DATA) as never
    );
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", false, async () => {}) as never
    );
    vi.mocked(OllamaProvider).mockImplementation(
      () => makeProvider("ollama", false, async () => {}) as never
    );

    const { extractFromUrl: extract } = await import("./index.js");

    const err = await extract({ url: "https://example.com", schema: SIMPLE_SCHEMA }).catch((e) => e);

    expect(isExtractError(err)).toBe(true);
    expect((err as ExtractError).statusCode).toBe(502);
    expect((err as ExtractError).message).toMatch(/Schema validation failed after repair/);
  });
});

describe("extractFromUrl — content truncation", () => {
  it("adds warning when content exceeds max chars", async () => {
    const longContent = "x".repeat(200_000);
    makeScrapeMock(longContent);

    const claudeExtract = vi.fn(async () => VALID_DATA);
    vi.mocked(ClaudeProvider).mockImplementation(
      () => makeProvider("claude", true, claudeExtract) as never
    );
    vi.mocked(OpenAIProvider).mockImplementation(
      () => makeProvider("openai", false, async () => {}) as never
    );
    vi.mocked(OllamaProvider).mockImplementation(
      () => makeProvider("ollama", true, async () => {}) as never
    );

    const { extractFromUrl: extract } = await import("./index.js");

    const result = await extract({ url: "https://example.com", schema: SIMPLE_SCHEMA });

    expect(result.warnings).toContain("content truncated to fit LLM context window");
    // Verify provider got truncated content (≤100k chars)
    const inputArg = claudeExtract.mock.calls[0][0] as { content: string };
    expect(inputArg.content.length).toBeLessThanOrEqual(100_000);
  });
});
