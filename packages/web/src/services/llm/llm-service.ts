import type { LLMProvider, CompletionRequest, CompletionResponse } from '@/types'

export class LLMService {
  private readonly providers = new Map<string, LLMProvider>()

  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.id, provider)
  }

  removeProvider(id: string): void {
    this.providers.delete(id)
  }

  listProviders(): LLMProvider[] {
    return Array.from(this.providers.values())
  }

  getProvider(id: string): LLMProvider | undefined {
    return this.providers.get(id)
  }

  async complete(providerId: string, request: CompletionRequest): Promise<CompletionResponse> {
    const provider = this.providers.get(providerId)
    if (!provider) throw new Error(`Provider not found: ${providerId}`)
    return provider.complete(request)
  }

  estimateTokens(providerId: string, text: string): number {
    const provider = this.providers.get(providerId)
    if (!provider) return Math.ceil(text.length / 4)
    return provider.estimateTokens(text)
  }

  async testConnection(providerId: string): Promise<{ success: boolean; error?: string }> {
    const provider = this.providers.get(providerId)
    if (!provider) return { success: false, error: 'Provider not found' }
    return provider.testConnection()
  }

  estimateBulkCost(providerId: string, texts: string[]): number {
    return texts.reduce((sum, text) => sum + this.estimateTokens(providerId, text), 0)
  }
}

export const llmService = new LLMService()
