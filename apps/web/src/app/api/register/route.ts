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

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  // Prefer X-Real-IP (set by a trusted reverse proxy) over X-Forwarded-For,
  // which an attacker can forge to cycle rate-limit buckets. Neither is
  // unforgeable without network-level enforcement, but X-Real-IP is harder to
  // spoof because most proxies only set it once (unlike XFF which appends).
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

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

  const { email, password, name } = parsed.data;
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
