import { withPage } from "../../scraper/browser.js";
import { scrapePage } from "../../scraper/extract.js";
import { validateData, validateSchema } from "./validate.js";
import { selectChain } from "./selectChain.js";
import { ExtractProvider, ProviderInput } from "./providers/types.js";

const EXTRACT_MAX_CONTENT_CHARS = parseInt(
  process.env.EXTRACT_MAX_CONTENT_CHARS ?? "100000",
  10
);

export interface ExtractOptions {
  url: string;
  schema: Record<string, unknown>;
  instructions?: string;
  provider?: string;
  waitForSelector?: string;
  timeout?: number;
}

export interface ExtractResult {
  extracted: unknown;
  provider: string;
  model: string;
  warnings: string[];
}

export class ExtractError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 422 | 502
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

export async function extractFromUrl(
  options: ExtractOptions
): Promise<ExtractResult> {
  // Validate the caller's schema up-front
  const schemaCheck = validateSchema(options.schema);
  if (!schemaCheck.valid) {
    throw new ExtractError(
      `Invalid JSON Schema: ${schemaCheck.errors.join("; ")}`,
      400
    );
  }

  // Build provider chain (throws ExtractError-compatible message on bad provider)
  let chain: ReturnType<typeof selectChain>;
  try {
    chain = selectChain(options.provider);
  } catch (err) {
    throw new ExtractError(
      err instanceof Error ? err.message : "Provider selection failed",
      400
    );
  }

  const warnings: string[] = [];

  // Scrape the page
  const scrapeResult = await withPage((page) =>
    scrapePage(page, {
      url: options.url,
      formats: ["markdown"],
      waitForSelector: options.waitForSelector,
      timeout: options.timeout,
    })
  );

  if (!scrapeResult.success || !scrapeResult.markdown) {
    throw new ExtractError(
      `Failed to scrape ${options.url}: ${scrapeResult.error ?? "empty content"}`,
      422
    );
  }

  // Truncate content to budget
  let content = scrapeResult.markdown;
  if (content.length > EXTRACT_MAX_CONTENT_CHARS) {
    content = content.slice(0, EXTRACT_MAX_CONTENT_CHARS);
    warnings.push("content truncated to fit LLM context window");
  }

  const providerErrors: string[] = [];

  for (const provider of chain.providers) {
    const result = await tryProvider(provider, {
      content,
      jsonSchema: options.schema,
      instructions: options.instructions,
    });

    if (result.success) {
      return {
        extracted: result.data,
        provider: provider.name,
        model: resolveModelName(provider.name),
        warnings,
      };
    }

    const errorMsg = `${provider.name}: ${result.error}`;
    providerErrors.push(errorMsg);

    // Explicit mode: hard-fail, no fallthrough
    if (chain.explicitMode) {
      throw new ExtractError(errorMsg, 502);
    }
  }

  // All auto-chain providers failed
  throw new ExtractError(
    `All providers failed extraction:\n${providerErrors.join("\n")}`,
    502
  );
}

interface ProviderAttemptResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

async function tryProvider(
  provider: ExtractProvider,
  input: ProviderInput
): Promise<ProviderAttemptResult> {
  // Attempt 1
  try {
    const raw = await provider.extract(input);
    const check = validateData(raw, input.jsonSchema);
    if (check.valid) return { success: true, data: raw };

    // Attempt 2: repair retry with AJV error context
    const repairContext = check.errors.join("; ");
    const repaired = await provider.extract({ ...input, repairContext });
    const repairCheck = validateData(repaired, input.jsonSchema);
    if (repairCheck.valid) return { success: true, data: repaired };

    return {
      success: false,
      error: `Schema validation failed after repair: ${repairCheck.errors.join("; ")}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function resolveModelName(providerName: string): string {
  switch (providerName) {
    case "claude":
      return process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
    case "openai":
      return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    case "ollama":
      return process.env.OLLAMA_MODEL ?? "llama3.1";
    default:
      return "unknown";
  }
}
