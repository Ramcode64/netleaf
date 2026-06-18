import OpenAI from "openai";
import { config } from "../../../config/index.js";
import { ExtractProvider, ProviderInput } from "./types.js";
import { buildSandwichedPrompt, parseProviderJson } from "./prompt.js";

export class OpenAIProvider implements ExtractProvider {
  readonly name = "openai" as const;
  private client: OpenAI | null = null;

  isConfigured(): boolean {
    return config.openaiApiKey.length > 0;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: config.openaiApiKey });
    }
    return this.client;
  }

  async extract(input: ProviderInput): Promise<unknown> {
    const client = this.getClient();
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const { system, user } = buildSandwichedPrompt(input);

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const response = await client.chat.completions.create({
      model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extracted_data",
          strict: true,
          schema: input.jsonSchema,
        },
      },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("OpenAI returned empty content");

    return parseProviderJson("openai", text);
  }
}
