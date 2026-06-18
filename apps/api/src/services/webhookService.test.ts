import { describe, it, expect, vi, beforeEach } from "vitest";

const updateSet = vi.fn().mockReturnThis();
const updateWhere = vi.fn().mockResolvedValue(undefined);

vi.mock("../db/client.js", () => ({
  getDb: () => ({
    update: () => ({ set: updateSet, where: updateWhere }),
  }),
  schema: { crawlJobs: { id: "id", webhookSent: "webhookSent" } },
}));

import { deliverWebhook } from "./webhookService.js";
import type { WebhookPageSummary } from "./webhookService.js";

const PAGES: WebhookPageSummary[] = [
  { url: "https://example.com", title: "Hi", success: true },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deliverWebhook", () => {
  it("posts payload and marks sent on a 2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await deliverWebhook("https://hook.test", "job-1", PAGES, fetchMock);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hook.test");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ jobId: "job-1", status: "completed", totalScraped: 1 });
    expect(init.headers["X-Netleaf-Event"]).toBe("crawl.completed");

    // marked sent
    expect(updateSet).toHaveBeenCalledWith({ webhookSent: true });
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });

  it("retries up to 3 times on non-2xx, then gives up", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const promise = deliverWebhook("https://hook.test", "job-2", PAGES, fetchMock);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(updateSet).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("retries on network error then succeeds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const promise = deliverWebhook("https://hook.test", "job-3", PAGES, fetchMock);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(updateSet).toHaveBeenCalledWith({ webhookSent: true });
    vi.useRealTimers();
  });
});
