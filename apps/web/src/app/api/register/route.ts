import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb, users } from "@/lib/db";

const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  name: z.string().min(1).max(100).optional(),
});

// Simple in-process rate limiter: 5 registrations per IP per 10 minutes.
// Not distributed — each serverless instance tracks independently — but still
// blocks naive scripted abuse effectively.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_MAP_SIZE = 10_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Evict expired entries when the map is large to prevent unbounded growth
  // (an attacker rotating IPv6 /64 addresses can otherwise grow it forever).
  if (attempts.size > MAX_MAP_SIZE) {
    for (const [k, v] of attempts) {
      if (now > v.resetAt) attempts.delete(k);
    }
  }

  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function normalizeEmail(input: string): string {
  return input.trim().normalize("NFKC").toLowerCase();
}

// TRUSTED_PROXY_IPS is a comma-separated list of proxy IPs whose forwarded
// headers we believe (e.g. "10.0.0.1,10.0.0.2"). When empty, we trust the
// platform: Vercel and Railway both terminate at their edge and set
// x-forwarded-for/x-real-ip themselves before the request reaches us.
function trustsForwardedHeaders(): boolean {
  // On Vercel and Railway the platform itself is the trusted proxy.
  if (process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT) return true;
  // Self-hosted: require explicit opt-in. Without this, an attacker who can
  // reach the Node process directly (port forwarded, container exposed) can
  // forge x-forwarded-for to cycle rate-limit buckets.
  return !!process.env.TRUSTED_PROXY_IPS;
}

function clientIp(request: Request): string {
  if (!trustsForwardedHeaders()) {
    // No trusted proxy declared — fall back to a single bucket so abuse from
    // any source still throttles globally. This is intentionally conservative
    // (false positives on shared networks) because the alternative — trusting
    // forged headers — is worse.
    return "untrusted-proxy";
  }
  // Trust the LEFTMOST entry of x-forwarded-for (the original client), or
  // x-real-ip. Both are set by the trusted proxy. Drop any whitespace.
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export async function POST(request: Request) {
  if (process.env.DISABLE_REGISTRATION === "true") {
    return NextResponse.json({ error: "Registration is disabled on this instance." }, { status: 403 });
  }

  const ip = clientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { password, name } = parsed.data;
  // Normalize stored email so login lookup (which also normalizes) finds the
  // row regardless of input casing/whitespace. Prevents duplicate accounts
  // for `User@Example.com` vs `user@example.com`.
  const email = normalizeEmail(parsed.data.email);
  const db = getDb();

  const passwordHash = await bcrypt.hash(password, 12);

  // Insert and rely on the UNIQUE(email) constraint to reject duplicates. This
  // avoids a check-then-insert race and avoids confirming whether an email is
  // registered (account enumeration) via a distinct error/status.
  try {
    const [created] = await db
      .insert(users)
      .values({ email, name: name ?? null, passwordHash })
      .returning({ id: users.id, email: users.email });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to register with the provided details." },
      { status: 400 }
    );
  }
}
