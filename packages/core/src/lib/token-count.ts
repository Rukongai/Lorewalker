import { countTokens } from '@character-foundry/character-foundry/tokenizers'

/**
 * Counts tokens in content, falling back to simple estimate if library throws.
 */
export function safeCountTokens(text: string): number {
  try {
    return countTokens(text)
  } catch {
    // Fallback: ~4 chars per token
    return Math.ceil(text.length / 4)
  }
}
