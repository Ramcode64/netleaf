import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../../config/index.js";
import { ExtractProvider, ProviderInput } from "./types.js";
import { buildSandwichedPrompt } from "./prompt.js";

export class ClaudeProvider implements ExtractProvider {
  readonly name = "claude" as const;
  private client: Anthropic | null = null;

  isConfigured(): boolean {
    return config.anthropicApiKey.length > 0;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    }
    return this.client;
  }

  async extract(input: ProviderInput): Promise<unknown> {
    const client = this.getClient();
    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
    const { system, user } = buildSandwichedPrompt(input);

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system,
      tools: [
        {
          name: "extract_data",
          description: "Extract structured data from web page content",
          input_schema: input.jsonSchema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: "extract_data" },
      messages: [{ role: "user", content: user }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude did not return a tool_use block");
    }

    return toolUse.input;
  }
}
