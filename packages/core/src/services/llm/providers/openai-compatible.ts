import type { LLMProvider, LLMProviderType, ProviderConfig, CompletionRequest, CompletionResponse } from '../../../types'

export type LLMErrorCode = 'auth' | 'network' | 'rate-limit' | 'model' | 'unknown'

export class LLMError extends Error {
  readonly code: LLMErrorCode
  constructor(message: string, code: LLMErrorCode) {
    super(message)
    this.name = 'LLMError'
    this.code = code
  }
}

function estimateTokensFallback(text: string): number {
  try {
    // dynamic import not available in sync context — use character estimate
    return Math.ceil(text.length / 4)
  } catch {
    return Math.ceil(text.length / 4)
  }
}

function mapErrorCode(status: number): LLMErrorCode {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate-limit'
  if (status === 404) return 'model'
  if (status >= 500) return 'network'
  return 'unknown'
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly id: string
  readonly name: string
  readonly type: LLMProviderType = 'openai-compatible'
  readonly config: ProviderConfig

  constructor(id: string, name: string, config: ProviderConfig) {
    this.id = id
    this.name = name
    this.config = config
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const messages: { role: string; content: string }[] = []
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content })
    }

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
    }

    if (request.responseFormat === 'json') {
      body.response_format = { type: 'json_object' }
    }

    let res: Response
    try {
      res = await fetch(`${this.config.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
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
      choices: { message: { content: string } }[]
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
      model: string
    }

    return {
      content: data.choices[0]?.message?.content ?? '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      model: data.model ?? this.config.model,
    }
  }

  estimateTokens(text: string): number {
    return estimateTokensFallback(text)
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
