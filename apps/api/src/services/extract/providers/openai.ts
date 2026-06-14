import OpenAI from "openai";
import { config } from "../../../config/index.js";
import { ExtractProvider, ProviderInput } from "./types.js";

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

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: [
          "You are a structured data extraction assistant.",
          "Extract information from the provided web page content.",
          input.instructions ? `Instructions: ${input.instructions}` : "",
          input.repairContext
            ? `Previous attempt failed validation. Errors:\n${input.repairContext}\nReturn corrected JSON only.`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        role: "user",
        content: `Extract structured data from this web page content:\n\n${input.content}`,
      },
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

    return JSON.parse(text);
  }
}
