import { z } from "zod";

/**
 * A Zod string that must be a syntactically valid http(s) URL. This rejects
 * file://, javascript:, ftp://, data:, etc at the request boundary. Network
 * reachability (private IPs, redirects) is enforced separately by the SSRF
 * guard (security/ssrf.ts) at fetch time.
 */
export const httpUrl = (msg = "must be a valid http(s) URL") =>
  z
    .string()
    .url(msg)
    .refine((v) => {
      try {
        const p = new URL(v).protocol;
        return p === "http:" || p === "https:";
      } catch {
        return false;
      }
    }, msg);
