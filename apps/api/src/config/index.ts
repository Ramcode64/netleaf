import "dotenv/config";

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
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
  ollamaUrl: optional("OLLAMA_URL", "http://localhost:11434"),
  braveApiKey: optional("BRAVE_API_KEY", ""),
} as const;
