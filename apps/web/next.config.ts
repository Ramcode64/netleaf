import type { NextConfig } from "next";

// NEXT_PUBLIC_API_URL is baked in at build time via Dockerfile ARG.
// It must be added to connect-src so the TryIt panel can reach the API from the browser.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// T4-1: when the API URL is loopback (the Vercel showcase ships the localhost
// placeholder), don't append it to connect-src — a public HTTPS page that
// allow-lists http://localhost:3000 is a mixed-content / confusing-CSP smell,
// and the UI already degrades those features via isLoopbackApiUrl(). Only widen
// connect-src when the API is a real remote origin.
function isLoopback(u: string): boolean {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(h);
  } catch {
    return false;
  }
}
const connectSrc = isLoopback(apiUrl) ? "connect-src 'self'" : `connect-src 'self' ${apiUrl}`;

// React's dev build needs 'unsafe-eval' for callstack reconstruction and hot-reload.
// The React team explicitly states eval() is never used in production builds.
const isDev = process.env.NODE_ENV !== "production";

// HSTS NOTE: only meaningful when served over HTTPS (behind a TLS-terminating proxy).
// Over plain HTTP, browsers ignore this header. Leave it in for production deployments
// behind nginx/caddy, but the operator must NOT submit the domain to the HSTS preload
// list until the site is HTTPS-only everywhere.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' required by Next.js for CSS-in-JS.
      // 'unsafe-eval' needed in dev for React callstack reconstruction — never used in production builds.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      // Allow the TryIt panel to POST to the API (may be on a different origin/port).
      // Drops to 'self' alone when apiUrl is loopback — see T4-1 note above.
      connectSrc,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// standalone output is for Docker only — Vercel handles its own output format
const isVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isVercel ? {} : { output: "standalone" }),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
