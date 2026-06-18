import NextAuth, { type NextAuthConfig } from "next-auth";

const _secret = process.env.AUTH_SECRET ?? "";
if (
  !_secret ||
  _secret.length < 32 ||
  /^(change.me|replace.me|secret|placeholder|example|changeme)/i.test(_secret)
) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is missing or is a placeholder. " +
      "Generate a secure value with: openssl rand -base64 32"
    );
  } else {
    console.warn(
      "\n⚠️  WARNING: AUTH_SECRET is weak or using a placeholder value.\n" +
      "   Sessions are not secure. Generate a real secret:\n" +
      "   openssl rand -base64 32\n"
    );
  }
}
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, users } from "./db";

// Sentinel hash for constant-time login. When the supplied email matches no row,
// we still run bcrypt.compare against this hash so the response time is
// indistinguishable from "email exists, wrong password". Without this an
// attacker can enumerate registered emails by timing alone (bcrypt cost 12 is
// ~150–250 ms, the no-user path returns in ~5 ms).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "netleaf-constant-time-sentinel-do-not-use",
  12
);

function normalizeEmail(input: string): string {
  // Trim, NFKC-normalize (collapses compatibility forms incl. Turkish dotless I),
  // then lowercase. Used as the rate-limit key so attackers can't bypass via
  // whitespace padding or Unicode case-folding tricks.
  return input.trim().normalize("NFKC").toLowerCase();
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const rawEmail = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!rawEmail || !password) return null;
      // Mirror the length caps enforced at registration to prevent oversized
      // strings from bloating the in-process rate-limit map or the DB query.
      if (rawEmail.length > 254 || password.length > 128) return null;

      // Use the normalized form for BOTH the rate-limit key and the DB lookup.
      // Without normalization an attacker bypasses per-email lockout by
      // submitting `victim@example.com `, `victim@example.com\t`, mixed
      // case, etc. — each variation is a distinct bucket.
      const email = normalizeEmail(rawEmail);

      // In-process login rate limit: 10 attempts per email per 15 minutes.
      // Limitation: resets on server restart and is not shared across processes
      // or serverless instances. For production multi-instance deployments,
      // replace with a Redis-backed counter. For single-instance self-hosting
      // this is sufficient to block naive credential-stuffing scripts.
      const LOGIN_WINDOW_MS = 15 * 60 * 1000;
      const LOGIN_MAX = 10;
      type LoginEntry = { count: number; resetAt: number };
      const g = globalThis as Record<string, unknown>;
      if (!g._loginAttempts) g._loginAttempts = new Map<string, LoginEntry>();
      const loginMap = g._loginAttempts as Map<string, LoginEntry>;

      const now = Date.now();

      // Evict expired entries to prevent unbounded map growth (memory leak)
      if (loginMap.size > 5000) {
        for (const [k, v] of loginMap) {
          if (now > v.resetAt) loginMap.delete(k);
        }
      }

      const entry = loginMap.get(email);
      if (entry && now < entry.resetAt) {
        entry.count++;
        if (entry.count > LOGIN_MAX) return null;
      } else {
        loginMap.set(email, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
      }

      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!user?.passwordHash) {
        // Run a dummy bcrypt compare to equalize response time with the
        // "wrong password" path. Without this an attacker times the response
        // to learn whether an email is registered (cf. SOC2 / OWASP ASVS 2.10).
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        return null;
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return { id: user.id, email: user.email, name: user.name ?? undefined };
    },
  }),
];

// Google is optional — only enabled when OAuth credentials are present
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
});
