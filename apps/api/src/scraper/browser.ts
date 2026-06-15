import { chromium, Browser, Page } from "playwright";
import { config } from "../config/index.js";
import { assertPublicUrl } from "../security/ssrf.js";

// Semaphore-based concurrency limiter. Instead of pooling and reusing
// BrowserContext objects, we limit the number of concurrent contexts and
// create a FRESH context for every withPage() call.
//
// Why: reusing a BrowserContext across requests leaks state between users.
// A malicious site can register a service worker that persists in the context
// after the page closes. The next request using that context — potentially from
// a different user — would have its navigation requests intercepted by the
// attacker's service worker. Cookies, localStorage, and IndexedDB also persist.
// A fresh context per request eliminates all of these cross-request contamination
// vectors with no security trade-offs (context creation is ~20–50 ms in Chromium).
class BrowserPool {
  private browser: Browser | null = null;
  private slots: number = 0;
  private readonly maxSlots: number;
  private queue: Array<() => void> = [];

  constructor(size: number) {
    this.maxSlots = size;
  }

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
  }

  private acquireSlot(): Promise<void> {
    if (this.slots < this.maxSlots) {
      this.slots++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private releaseSlot(): void {
    if (this.queue.length > 0) {
      this.queue.shift()!();
    } else {
      this.slots--;
    }
  }

  async withFreshContext<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    await this.acquireSlot();

    const ctx = await this.browser!.newContext({
      userAgent: "Mozilla/5.0 (compatible; Netleaf/1.0; +https://netleaf.org/bot)",
      viewport: { width: 1280, height: 720 },
      javaScriptEnabled: true,
    });

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
      // Closing the context (not just the page) destroys all state — cookies,
      // service workers, localStorage, IndexedDB, cache — guaranteeing isolation.
      await ctx.close();
      this.releaseSlot();
    }
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }
}

export const pool = new BrowserPool(config.browserPoolSize);

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  return pool.withFreshContext(fn);
}
