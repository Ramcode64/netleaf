import dns from "dns/promises";
import net from "net";

/**
 * SSRF egress guard.
 *
 * Netleaf fetches attacker-supplied URLs with a headless browser and plain
 * fetch(). Without this guard an attacker can reach cloud metadata
 * (169.254.169.254), localhost services, and the internal network, or read
 * local files via file://. This module is the single chokepoint that all
 * outbound-to-user-URL paths must go through.
 *
 * Set ALLOW_PRIVATE_IPS=true ONLY for trusted local development where you
 * explicitly want to scrape localhost / LAN hosts. It disables the guard.
 */

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const MAX_REDIRECTS = 5;

// Evaluated at call time (not module load) so tests and runtime config can
// toggle it. Set ALLOW_PRIVATE_IPS=true ONLY for trusted local scraping.
function allowPrivate(): boolean {
  return process.env.ALLOW_PRIVATE_IPS === "true";
}

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = n * 256 + o;
  }
  return n >>> 0;
}

function inCidr(ipInt: number, base: string, bits: number): boolean {
  const baseInt = ipv4ToInt(base)!;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/** IPv4 ranges that must never be reachable from a user-supplied URL. */
function isBlockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable → treat as blocked
  return (
    inCidr(n, "0.0.0.0", 8) ||        // "this" network / 0.0.0.0
    inCidr(n, "10.0.0.0", 8) ||       // private
    inCidr(n, "100.64.0.0", 10) ||    // CGNAT
    inCidr(n, "127.0.0.0", 8) ||      // loopback
    inCidr(n, "169.254.0.0", 16) ||   // link-local incl. cloud metadata
    inCidr(n, "172.16.0.0", 12) ||    // private
    inCidr(n, "192.0.0.0", 24) ||     // IETF protocol assignments
    inCidr(n, "192.168.0.0", 16) ||   // private
    inCidr(n, "198.18.0.0", 15) ||    // benchmarking
    inCidr(n, "224.0.0.0", 4) ||      // multicast
    inCidr(n, "240.0.0.0", 4)         // reserved / broadcast
  );
}

function isBlockedV6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0]; // strip zone id

  // IPv4-mapped, dotted form (::ffff:1.2.3.4)
  const dotted = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return isBlockedV4(dotted[1]);

  // IPv4-mapped, hex form (::ffff:a9fe:a9fe) — the WHATWG URL parser emits this.
  const hex = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isBlockedV4(v4);
  }

  if (addr === "::1" || addr === "::") return true;          // loopback / unspecified
  if (addr.startsWith("fe8") || addr.startsWith("fe9") ||
      addr.startsWith("fea") || addr.startsWith("feb")) return true; // fe80::/10 link-local
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true;   // fc00::/7 ULA
  if (addr.startsWith("ff")) return true;                            // ff00::/8 multicast
  if (addr.startsWith("64:ff9b:")) return true;                      // NAT64 → could embed v4

  return false;
}

function isBlockedIp(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isBlockedV4(ip);
  if (kind === 6) return isBlockedV6(ip);
  return true; // not a valid IP → block
}

/**
 * Validate a single URL: scheme allowlist + DNS resolution + IP range check.
 * Returns the parsed URL on success; throws SsrfError otherwise.
 * Does NOT follow redirects — use safeFetch for that.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new SsrfError("Invalid URL");
  }

  if (!ALLOWED_SCHEMES.has(u.protocol)) {
    throw new SsrfError(`Blocked URL scheme: ${u.protocol} (only http/https allowed)`);
  }

  if (allowPrivate()) return u;

  const host = u.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  let ips: string[];
  if (net.isIP(host)) {
    ips = [host];
  } else {
    let records: Array<{ address: string }>;
    try {
      records = await dns.lookup(host, { all: true });
    } catch {
      throw new SsrfError(`DNS resolution failed for ${host}`);
    }
    ips = records.map((r) => r.address);
    if (ips.length === 0) throw new SsrfError(`No DNS records for ${host}`);
  }

  for (const ip of ips) {
    if (isBlockedIp(ip)) {
      throw new SsrfError(`Blocked host: ${host} resolves to non-public address ${ip}`);
    }
  }

  return u;
}

/**
 * fetch() that re-validates every redirect hop against assertPublicUrl,
 * defeating redirect-based SSRF and (per-hop) DNS rebinding. Redirects are
 * handled manually so a public URL cannot 302 to an internal one.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  maxRedirects = MAX_REDIRECTS
): Promise<Response> {
  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const u = await assertPublicUrl(current);
    const res = await fetch(u, { ...init, redirect: "manual" });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res; // redirect with no target — hand back as-is
      current = new URL(location, u).toString();
      continue;
    }

    return res;
  }

  throw new SsrfError("Too many redirects");
}
