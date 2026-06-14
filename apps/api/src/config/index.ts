import "dotenv/config";

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function validateOllamaUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error(`OLLAMA_URL must be http(s), got: ${u.protocol}`);
    }
    // Block cloud metadata endpoints regardless of who set the env var
    if (/^169\.254\./.test(u.hostname)) {
      throw new Error("OLLAMA_URL must not point to a link-local (169.254.x.x) address");
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
