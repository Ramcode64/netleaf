import { config } from "../../../config/index.js";
import { ExtractProvider, ProviderInput } from "./types.js";
import { buildSandwichedPrompt, parseProviderJson } from "./prompt.js";

export class OllamaProvider implements ExtractProvider {
  readonly name = "ollama" as const;

  isConfigured(): boolean {
    // Ollama needs no key — always "configured"; reachability checked at call time
    return true;
  }

  async extract(input: ProviderInput): Promise<unknown> {
    const model = process.env.OLLAMA_MODEL ?? "llama3.1";
    const url = `${config.ollamaUrl}/api/chat`;
    const { system, user } = buildSandwichedPrompt(input);

    // Ollama can't enforce a strict JSON Schema like Claude/OpenAI, so we append
    // the schema to the system prompt as a soft contract. The schema is from
    // the trusted API caller, not the scraped page, so it's safe to include.
    const ollamaSystem =
      system +
      "\n\nReturn valid JSON conforming to this schema:\n" +
      JSON.stringify(input.jsonSchema, null, 2);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          format: "json",
          stream: false,
          messages: [
            { role: "system", content: ollamaSystem },
            { role: "user", content: user },
          ],
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    const text = data?.message?.content;
    if (!text) throw new Error("Ollama returned empty content");

    return parseProviderJson("ollama", text);
  }
}
