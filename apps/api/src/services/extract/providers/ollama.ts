import { config } from "../../../config/index.js";
import { ExtractProvider, ProviderInput } from "./types.js";

export class OllamaProvider implements ExtractProvider {
  readonly name = "ollama" as const;

  isConfigured(): boolean {
    // Ollama needs no key — always "configured"; reachability checked at call time
    return true;
  }

  async extract(input: ProviderInput): Promise<unknown> {
    const model = process.env.OLLAMA_MODEL ?? "llama3.1";
    const url = `${config.ollamaUrl}/api/chat`;

    const systemPrompt = [
      "You are a structured data extraction assistant.",
      "Extract information from the provided web page content.",
      `You MUST return valid JSON that conforms to this schema:\n${JSON.stringify(input.jsonSchema, null, 2)}`,
      input.instructions ? `Instructions: ${input.instructions}` : "",
      input.repairContext
        ? `Previous attempt failed validation. Errors:\n${input.repairContext}\nReturn corrected JSON only.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

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
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Extract structured data from this web page content:\n\n${input.content}`,
            },
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

    return JSON.parse(text);
  }
}
