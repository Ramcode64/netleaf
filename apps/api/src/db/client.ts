import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = postgres(url, { max: 10 });
    _db = drizzle(_sql, { schema });
  }
  return _db as ReturnType<typeof drizzle<typeof schema>>;
}

/**
 * Raw postgres-js client for operations Drizzle doesn't expose (advisory locks,
 * LISTEN/NOTIFY, etc). Reuses the same pool as getDb().
 */
export function getSql(): ReturnType<typeof postgres> {
  if (!_sql) {
    // Force pool initialization via getDb()
    getDb();
  }
  return _sql!;
}

export { schema };
