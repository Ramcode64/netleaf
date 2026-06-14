import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock drizzle db before importing diffService
vi.mock("../db/client.js", () => {
  const selectMock = vi.fn();
  return {
    getDb: () => ({ select: selectMock }),
    schema: {
      crawlSnapshots: { jobId: "jobId", url: "url", contentHash: "contentHash" },
    },
    selectMock,
  };
});

import { diffJobs } from "./diffService.js";
import { getDb, selectMock } from "../db/client.js";

function makeSnapshot(url: string, contentHash: string) {
  return { url, contentHash, id: "id", jobId: "job", markdown: "", createdAt: new Date() };
}

function mockDb(snapshotsA: ReturnType<typeof makeSnapshot>[], snapshotsB: ReturnType<typeof makeSnapshot>[]) {
  let callCount = 0;
  (getDb() as unknown as { select: ReturnType<typeof vi.fn> }).select.mockImplementation(() => {
    const results = callCount === 0 ? snapshotsA : snapshotsB;
    callCount++;
    return {
      from: () => ({
        where: async () => results,
      }),
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("diffJobs", () => {
  it("detects added pages (present in B but not A)", async () => {
    mockDb(
      [makeSnapshot("https://example.com/page1", "hash1")],
      [
        makeSnapshot("https://example.com/page1", "hash1"),
        makeSnapshot("https://example.com/page2", "hash2"),
      ]
    );

    const result = await diffJobs({ jobIdA: "job-a", jobIdB: "job-b" });

    expect(result.added).toHaveLength(1);
    expect(result.added[0].url).toBe("https://example.com/page2");
    expect(result.summary.added).toBe(1);
  });

  it("detects removed pages (present in A but not B)", async () => {
    mockDb(
      [
        makeSnapshot("https://example.com/page1", "hash1"),
        makeSnapshot("https://example.com/gone", "hash-gone"),
      ],
      [makeSnapshot("https://example.com/page1", "hash1")]
    );

    const result = await diffJobs({ jobIdA: "job-a", jobIdB: "job-b" });

    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].url).toBe("https://example.com/gone");
    expect(result.summary.removed).toBe(1);
  });

  it("detects changed pages (same URL, different hash)", async () => {
    mockDb(
      [makeSnapshot("https://example.com/page1", "hash-old")],
      [makeSnapshot("https://example.com/page1", "hash-new")]
    );

    const result = await diffJobs({ jobIdA: "job-a", jobIdB: "job-b" });

    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].hashA).toBe("hash-old");
    expect(result.changed[0].hashB).toBe("hash-new");
  });

  it("marks unchanged pages (same URL, same hash)", async () => {
    mockDb(
      [makeSnapshot("https://example.com/page1", "same-hash")],
      [makeSnapshot("https://example.com/page1", "same-hash")]
    );

    const result = await diffJobs({ jobIdA: "job-a", jobIdB: "job-b" });

    expect(result.unchanged).toHaveLength(1);
    expect(result.changed).toHaveLength(0);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  it("returns correct summary counts", async () => {
    mockDb(
      [
        makeSnapshot("https://example.com/same", "hash-same"),
        makeSnapshot("https://example.com/changed", "hash-v1"),
        makeSnapshot("https://example.com/removed", "hash-removed"),
      ],
      [
        makeSnapshot("https://example.com/same", "hash-same"),
        makeSnapshot("https://example.com/changed", "hash-v2"),
        makeSnapshot("https://example.com/added", "hash-added"),
      ]
    );

    const result = await diffJobs({ jobIdA: "job-a", jobIdB: "job-b" });

    expect(result.summary).toMatchObject({
      totalA: 3,
      totalB: 3,
      added: 1,
      removed: 1,
      changed: 1,
      unchanged: 1,
    });
  });

  it("handles empty snapshots (both jobs have no pages)", async () => {
    mockDb([], []);

    const result = await diffJobs({ jobIdA: "job-a", jobIdB: "job-b" });

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.changed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });
});
