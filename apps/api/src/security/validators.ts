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

/**
 * Checks whether a user-supplied regex pattern is safe to compile and run.
 * Rejects patterns longer than 200 chars and patterns containing constructs
 * that cause catastrophic backtracking (ReDoS).
 *
 * Blocked patterns (examples):
 *   Nested quantifiers:    (a+)+   ([a-z]+)*   (.*){2,}
 *   Alternation + quant:  (a|aa)+  (a|a?)+     ([a-z]+|[a-z]+)*
 *   Consecutive quants:   a++      a+?
 */
export function isSafeRegexPattern(pattern: string): boolean {
  if (pattern.length > 200) return false;
  // Nested quantifiers: quantified group followed by another quantifier.
  // Catches (a+)*, (a+)+, ([abc]*)?, and variants.
  if (/\([^)]*[+*?]\)\s*[+*?{]/.test(pattern)) return false;
  // Consecutive quantifiers on the same token: a++ or a+?
  if (/[+*?}]\s*[+*?]/.test(pattern)) return false;
  // Alternation inside a quantified group: (a|aa)+ — alternation creates
  // overlapping matches that cause catastrophic backtracking even without a
  // nested quantifier inside the group.
  if (/\([^)]*\|[^)]*\)\s*[+*?{]/.test(pattern)) return false;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
