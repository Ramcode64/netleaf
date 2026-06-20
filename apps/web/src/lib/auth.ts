import NextAuth, { type NextAuthConfig } from "next-auth";

const _secret = process.env.AUTH_SECRET ?? "";
// Skip the hard check during `next build` (page-data collection): the secret
// is a RUNTIME concern, injected when the container starts, not baked into the
// image. Without this, a Docker build with AUTH_SECRET passed only as a runtime
// env (not a build ARG) crashes at static analysis. The throw still fires at
// runtime on a real missing/weak secret.
const _isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (
  !_isBuildPhase &&
  (!_secret ||
    _secret.length < 32 ||
    /^(change.me|replace.me|secret|placeholder|example|changeme)/i.test(_secret))
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
import { isRateLimited } from "./rate-limit";

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

      // Login rate limit: 10 attempts per email per 15 minutes. Distributed via
      // Upstash when configured (T-11), per-instance in-memory otherwise.
      // Keyed on the normalized email so case/whitespace variants share a bucket.
      if (await isRateLimited(`login:${email}`, 10, 15 * 60)) {
        return null;
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
