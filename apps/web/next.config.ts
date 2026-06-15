import type { NextConfig } from "next";

// NEXT_PUBLIC_API_URL is baked in at build time via Dockerfile ARG.
// It must be added to connect-src so the TryIt panel can reach the API from the browser.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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
      // Allow the TryIt panel to POST to the API (may be on a different origin/port)
      `connect-src 'self' ${apiUrl}`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
