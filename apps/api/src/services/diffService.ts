import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../db/client.js";

export interface DiffOptions {
  jobIdA: string;
  jobIdB: string;
  userId?: string;
}

export interface PageDiff {
  url: string;
  status: "added" | "removed" | "changed" | "unchanged";
  hashA?: string;
  hashB?: string;
}

export interface DiffResult {
  jobIdA: string;
  jobIdB: string;
  added: PageDiff[];
  removed: PageDiff[];
  changed: PageDiff[];
  unchanged: PageDiff[];
  summary: {
    totalA: number;
    totalB: number;
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
}

export async function diffJobs(options: DiffOptions): Promise<DiffResult | null> {
  const db = getDb();
  const { jobIdA, jobIdB, userId } = options;

  // Verify ownership of both jobs when running in authenticated mode
  if (userId) {
    const [jobA, jobB] = await Promise.all([
      db.query.crawlJobs.findFirst({
        where: and(eq(schema.crawlJobs.id, jobIdA), eq(schema.crawlJobs.userId, userId)),
        columns: { id: true },
      }),
      db.query.crawlJobs.findFirst({
        where: and(eq(schema.crawlJobs.id, jobIdB), eq(schema.crawlJobs.userId, userId)),
        columns: { id: true },
      }),
    ]);
    if (!jobA || !jobB) return null; // caller should treat as 404
  }

  // Select only the columns needed for comparison — markdown can be up to 5 MB
  // per row; fetching it for two 500-page crawls would pull ~5 GB into heap.
  const cols = {
    url: schema.crawlSnapshots.url,
    contentHash: schema.crawlSnapshots.contentHash,
  };
  const [snapshotsA, snapshotsB] = await Promise.all([
    db.select(cols).from(schema.crawlSnapshots).where(eq(schema.crawlSnapshots.jobId, jobIdA)),
    db.select(cols).from(schema.crawlSnapshots).where(eq(schema.crawlSnapshots.jobId, jobIdB)),
  ]);

  const mapA = new Map(snapshotsA.map((s) => [s.url, s.contentHash]));
  const mapB = new Map(snapshotsB.map((s) => [s.url, s.contentHash]));

  const allUrls = new Set([...mapA.keys(), ...mapB.keys()]);

  const added: PageDiff[] = [];
  const removed: PageDiff[] = [];
  const changed: PageDiff[] = [];
  const unchanged: PageDiff[] = [];

  for (const url of allUrls) {
    const hashA = mapA.get(url);
    const hashB = mapB.get(url);

    if (!hashA && hashB) {
      added.push({ url, status: "added", hashB });
    } else if (hashA && !hashB) {
      removed.push({ url, status: "removed", hashA });
    } else if (hashA && hashB && hashA !== hashB) {
      changed.push({ url, status: "changed", hashA, hashB });
    } else {
      unchanged.push({ url, status: "unchanged", hashA, hashB });
    }
  }

  return {
    jobIdA,
    jobIdB,
    added,
    removed,
    changed,
    unchanged,
    summary: {
      totalA: snapshotsA.length,
      totalB: snapshotsB.length,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged: unchanged.length,
    },
  };
}
