export type LLMProviderType = 'openai-compatible' | 'anthropic';

export interface ProviderConfig {
  apiBase: string;         // e.g., "https://api.openai.com/v1" or "http://localhost:11434/v1"
  apiKey: string;          // Empty string for keyless endpoints (Ollama)
  model: string;           // e.g., "gpt-4o", "claude-sonnet-4-20250514", "llama3"
  maxTokens: number;
  temperature: number;
}

export interface CompletionRequest {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CompletionResponse {
  content: string;
  usage: TokenUsage;
  model: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  type: LLMProviderType;
  config: ProviderConfig;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete?(request: CompletionRequest): AsyncIterable<string>;
  estimateTokens(text: string): number;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
