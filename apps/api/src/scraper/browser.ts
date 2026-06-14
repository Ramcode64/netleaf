import { chromium, Browser, BrowserContext, Page } from "playwright";
import { config } from "../config/index.js";
import { assertPublicUrl } from "../security/ssrf.js";

class BrowserPool {
  private browser: Browser | null = null;
  private contexts: BrowserContext[] = [];
  private available: BrowserContext[] = [];
  private queue: Array<(ctx: BrowserContext) => void> = [];

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    for (let i = 0; i < config.browserPoolSize; i++) {
      const ctx = await this.browser.newContext({
        userAgent:
          "Mozilla/5.0 (compatible; Netleaf/1.0; +https://netleaf.org/bot)",
        viewport: { width: 1280, height: 720 },
        javaScriptEnabled: true,
      });
      this.contexts.push(ctx);
      this.available.push(ctx);
    }
  }

  async acquire(): Promise<BrowserContext> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release(ctx: BrowserContext): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next(ctx);
    } else {
      this.available.push(ctx);
    }
  }

  async close(): Promise<void> {
    for (const ctx of this.contexts) {
      await ctx.close();
    }
    await this.browser?.close();
  }
}

export const pool = new BrowserPool();

export async function withPage<T>(
  fn: (page: Page) => Promise<T>
): Promise<T> {
  const ctx = await pool.acquire();
  const page = await ctx.newPage();

  // SSRF guard: validate every top-level navigation (incl. redirect hops) so a
  // public URL cannot redirect into cloud metadata / internal hosts, and block
  // non-http(s) schemes (file://, etc). Subresources are not returned to the
  // caller, so we only gate navigation requests.
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (!req.isNavigationRequest()) {
      return route.continue();
    }
    try {
      await assertPublicUrl(req.url());
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });

  try {
    return await fn(page);
  } finally {
    await page.close();
    pool.release(ctx);
  }
}
