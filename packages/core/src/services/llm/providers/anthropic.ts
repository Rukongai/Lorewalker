import type { LLMProvider, LLMProviderType, ProviderConfig, CompletionRequest, CompletionResponse } from '../../../types'
import { LLMError, type LLMErrorCode } from './openai-compatible'

function mapErrorCode(status: number): LLMErrorCode {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate-limit'
  if (status === 404) return 'model'
  if (status >= 500) return 'network'
  return 'unknown'
}

export class AnthropicProvider implements LLMProvider {
  readonly id: string
  readonly name: string
  readonly type: LLMProviderType = 'anthropic'
  readonly config: ProviderConfig

  constructor(id: string, name: string, config: ProviderConfig) {
    this.id = id
    this.name = name
    this.config = config
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
    }

    if (request.systemPrompt) {
      body.system = request.systemPrompt
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    } else if (this.config.temperature !== undefined) {
      body.temperature = this.config.temperature
    }

    let res: Response
    try {
      res = await fetch(`${this.config.apiBase}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })
    } catch (err) {
      throw new LLMError(`Network error: ${err instanceof Error ? err.message : String(err)}`, 'network')
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new LLMError(`HTTP ${res.status}: ${text}`, mapErrorCode(res.status))
    }

    const data = await res.json() as {
      content: { type: string; text: string }[]
      usage: { input_tokens: number; output_tokens: number }
      model: string
    }

    const textContent = data.content.find((c) => c.type === 'text')?.text ?? ''

    return {
      content: textContent,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      model: data.model ?? this.config.model,
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.complete({
        systemPrompt: '',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 1,
        temperature: 0,
      })
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}
