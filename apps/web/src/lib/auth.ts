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

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      // Rate limit: 10 login attempts per email per 15 minutes
      const loginAttempts = (globalThis as Record<string, unknown>)._loginAttempts as
        | Map<string, { count: number; resetAt: number }>
        | undefined;
      const loginMap =
        loginAttempts ??
        ((globalThis as Record<string, unknown>)._loginAttempts = new Map<
          string,
          { count: number; resetAt: number }
        >());
      const key = email.toLowerCase();
      const now = Date.now();
      const entry = loginMap.get(key);
      if (entry && now < entry.resetAt) {
        entry.count++;
        if (entry.count > 10) return null;
      } else {
        loginMap.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
      }

      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user?.passwordHash) return null;

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
