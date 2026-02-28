/**
 * Simple token count estimate: ~4 characters per token (GPT-4 approximation).
 * Actual counting via character-foundry is done in TransformService.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}
