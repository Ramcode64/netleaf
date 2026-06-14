export type ProviderName = "claude" | "openai" | "ollama";

export interface ProviderInput {
  content: string;
  jsonSchema: Record<string, unknown>;
  instructions?: string;
  repairContext?: string;
}

export interface ExtractProvider {
  name: ProviderName;
  isConfigured(): boolean;
  extract(input: ProviderInput): Promise<unknown>;
}
