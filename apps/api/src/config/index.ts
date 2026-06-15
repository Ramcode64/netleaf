import "dotenv/config";

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// Private/reserved IP ranges that OLLAMA_URL must not point to in production.
// These are the same ranges blocked by the SSRF guard (security/ssrf.ts).
// In local dev, Ollama always runs on localhost — this validation is intentionally
// permissive for the default value (http://localhost:11434) because local usage is
// the primary use case. The check below blocks only the cloud-metadata range to
// prevent operator misconfiguration from turning OLLAMA_URL into an SSRF vector
// when the server is deployed publicly. Full network-level restrictions should be
// enforced at the infrastructure level (firewall / egress policy).
function validateOllamaUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error(`OLLAMA_URL must be http(s), got: ${u.protocol}`);
    }
    // Block link-local / cloud metadata regardless of who set the env var
    if (/^169\.254\./.test(u.hostname)) {
      throw new Error("OLLAMA_URL must not point to a link-local (169.254.x.x) address");
    }
    // Block the unspecified address
    if (u.hostname === "0.0.0.0") {
      throw new Error("OLLAMA_URL must not point to 0.0.0.0");
    }
    return raw;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("OLLAMA_URL")) throw e;
    throw new Error(`OLLAMA_URL is not a valid URL: ${raw}`);
  }
}

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  env: optional("NODE_ENV", "development"),
  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),
  databaseUrl: optional("DATABASE_URL", ""),
  localMode: optional("LOCAL_MODE", "false") === "true",
  legacyApiKeys: optional("LEGACY_API_KEYS", ""),

  browserPoolSize: parseInt(optional("BROWSER_POOL_SIZE", "3"), 10),
  defaultTimeoutMs: parseInt(optional("DEFAULT_TIMEOUT_MS", "30000"), 10),
  maxCrawlPages: parseInt(optional("MAX_CRAWL_PAGES", "100"), 10),

  anthropicApiKey: optional("ANTHROPIC_API_KEY", ""),
  openaiApiKey: optional("OPENAI_API_KEY", ""),
  ollamaUrl: validateOllamaUrl(optional("OLLAMA_URL", "http://localhost:11434")),
  braveApiKey: optional("BRAVE_API_KEY", ""),
} as const;
