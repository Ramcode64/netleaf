import { ExtractProvider, ProviderName } from "./providers/types.js";
import { ClaudeProvider } from "./providers/claude.js";
import { OpenAIProvider } from "./providers/openai.js";
import { OllamaProvider } from "./providers/ollama.js";

// Singleton provider instances
const ALL_PROVIDERS: ExtractProvider[] = [
  new ClaudeProvider(),
  new OpenAIProvider(),
  new OllamaProvider(),
];

const PROVIDER_MAP = new Map<ProviderName, ExtractProvider>(
  ALL_PROVIDERS.map((p) => [p.name, p])
);

export interface ChainResult {
  providers: ExtractProvider[];
  explicitMode: boolean;
}

export function selectChain(requestedProvider?: string): ChainResult {
  if (requestedProvider) {
    const provider = PROVIDER_MAP.get(requestedProvider as ProviderName);
    if (!provider) {
      throw new Error(
        `Unknown provider "${requestedProvider}". Valid options: claude, openai, ollama`
      );
    }
    // Explicit mode: single-element chain, no fallthrough on failure
    return { providers: [provider], explicitMode: true };
  }

  // Auto mode: Claude → OpenAI → Ollama, skip unconfigured (except Ollama which is always on)
  const chain = ALL_PROVIDERS.filter((p) => p.isConfigured());
  if (chain.length === 0) {
    throw new Error(
      "No LLM provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or ensure Ollama is running."
    );
  }

  return { providers: chain, explicitMode: false };
}
