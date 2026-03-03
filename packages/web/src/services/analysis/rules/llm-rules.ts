import type { Rule, Finding, AnalysisContext } from '@/types/analysis'
import type { LLMService } from '@/services/llm/llm-service'
import { generateId } from '@/lib/uuid'

function getLLMService(context: AnalysisContext): LLMService | undefined {
  return context.llmService as LLMService | undefined
}

function getActiveProviderId(context: AnalysisContext): string | undefined {
  const svc = getLLMService(context)
  if (!svc) return undefined
  const providers = svc.listProviders()
  return providers[0]?.id
}

const qualityAssessmentRule: Rule = {
  id: 'content/quality-assessment',
  name: 'Content Quality Assessment',
  description: 'Uses AI to evaluate each entry\'s prose quality and flag entries with flat or unspecific content.',
  category: 'content',
  severity: 'suggestion',
  requiresLLM: true,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const svc = getLLMService(context)
    const providerId = getActiveProviderId(context)
    if (!svc || !providerId) return []

    const entries = context.entries.filter((e) => e.content.trim().length > 0)
    if (entries.length === 0) return []

    const entrySummaries = entries
      .map((e) => `ID: ${e.id}\nName: ${e.name}\nContent (first 200 chars): ${e.content.slice(0, 200)}`)
      .join('\n\n---\n\n')

    const systemPrompt = `You are a lorebook editor evaluating the quality of lorebook entries for AI roleplay. Rate each entry's content quality on a scale of 1-5 and identify entries with flat prose or lacking specificity (score ≤ 2). Respond with valid JSON only.`

    const userMessage = `Evaluate these lorebook entries and return a JSON array. Each object should have: entryId (string), score (1-5 integer), reason (string, max 100 chars).

Entries:
${entrySummaries}

Return format: [{"entryId": "...", "score": 3, "reason": "..."}]`

    try {
      const response = await svc.complete(providerId, {
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        responseFormat: 'json',
      })

      const parsed = JSON.parse(response.content) as { entryId: string; score: number; reason: string }[]
      const findings: Finding[] = []

      for (const item of parsed) {
        if (item.score <= 2) {
          findings.push({
            id: generateId(),
            ruleId: 'content/quality-assessment',
            severity: 'suggestion',
            category: 'content',
            message: `Low quality content (score ${item.score}/5): ${item.reason}`,
            entryIds: [item.entryId],
            details: 'Consider rewriting with more specific details, distinctive traits, or concrete examples that give the AI clearer guidance.',
          })
        }
      }

      return findings
    } catch (err) {
      return [{
        id: generateId(),
        ruleId: 'content/quality-assessment',
        severity: 'warning',
        category: 'content',
        message: `Deep Analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        entryIds: [],
      }]
    }
  },
}

const structureCheckRule: Rule = {
  id: 'content/structure-check',
  name: 'Content Structure Check',
  description: 'Uses AI to identify entries that would benefit from structured formats (brackets, tables) over narrative prose.',
  category: 'content',
  severity: 'suggestion',
  requiresLLM: true,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const svc = getLLMService(context)
    const providerId = getActiveProviderId(context)
    if (!svc || !providerId) return []

    const entries = context.entries.filter((e) => e.content.trim().length > 50)
    if (entries.length === 0) return []

    const entrySummaries = entries
      .map((e) => `ID: ${e.id}\nName: ${e.name}\nContent (first 200 chars): ${e.content.slice(0, 200)}`)
      .join('\n\n---\n\n')

    const systemPrompt = `You are a lorebook editor. Identify entries that use narrative prose where a structured format (like [trait: value] pairs, bulleted lists, or tabular data) would be more effective for LLM injection and retrieval. Only flag entries where the change would meaningfully improve clarity. Respond with valid JSON only.`

    const userMessage = `Review these lorebook entries. Return a JSON array of entries that would benefit from restructuring. Each object: entryId (string), suggestion (string, max 150 chars describing what format to use).

Entries:
${entrySummaries}

Return format: [{"entryId": "...", "suggestion": "..."}]`

    try {
      const response = await svc.complete(providerId, {
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        responseFormat: 'json',
      })

      const parsed = JSON.parse(response.content) as { entryId: string; suggestion: string }[]
      return parsed.map((item) => ({
        id: generateId(),
        ruleId: 'content/structure-check',
        severity: 'suggestion' as const,
        category: 'content' as const,
        message: `Consider restructuring: ${item.suggestion}`,
        entryIds: [item.entryId],
        details: 'Structured formats like [key: value] pairs or bulleted lists are often easier for LLMs to parse and use accurately than narrative prose.',
      }))
    } catch (err) {
      return [{
        id: generateId(),
        ruleId: 'content/structure-check',
        severity: 'warning',
        category: 'content',
        message: `Deep Analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        entryIds: [],
      }]
    }
  },
}

const scopeCheckRule: Rule = {
  id: 'content/scope-check',
  name: 'Entry Scope Check',
  description: 'Uses AI to identify entries that cover multiple distinct concepts and should be split into separate entries.',
  category: 'content',
  severity: 'warning',
  requiresLLM: true,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const svc = getLLMService(context)
    const providerId = getActiveProviderId(context)
    if (!svc || !providerId) return []

    const entries = context.entries.filter((e) => e.content.trim().length > 100)
    if (entries.length === 0) return []

    const entrySummaries = entries
      .map((e) => `ID: ${e.id}\nName: ${e.name}\nContent (first 300 chars): ${e.content.slice(0, 300)}`)
      .join('\n\n---\n\n')

    const systemPrompt = `You are a lorebook editor. Identify entries that cover multiple distinct concepts, characters, locations, or topics. These should be split into separate entries so each can be activated independently with targeted keywords. Only flag entries where splitting would meaningfully improve the lorebook. Respond with valid JSON only.`

    const userMessage = `Review these lorebook entries for scope issues. Return a JSON array of entries covering multiple distinct concepts. Each object: entryId (string), concepts (string array of 2-4 distinct topics), splitSuggestion (string, brief description of how to split, max 150 chars).

Entries:
${entrySummaries}

Return format: [{"entryId": "...", "concepts": ["topic1", "topic2"], "splitSuggestion": "..."}]`

    try {
      const response = await svc.complete(providerId, {
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        responseFormat: 'json',
      })

      const parsed = JSON.parse(response.content) as { entryId: string; concepts: string[]; splitSuggestion: string }[]
      return parsed.map((item) => ({
        id: generateId(),
        ruleId: 'content/scope-check',
        severity: 'warning' as const,
        category: 'content' as const,
        message: `Entry covers ${item.concepts.length} concepts (${item.concepts.join(', ')}): ${item.splitSuggestion}`,
        entryIds: [item.entryId],
        details: 'Splitting this entry allows each concept to be activated independently with targeted keywords, improving precision and reducing token waste.',
      }))
    } catch (err) {
      return [{
        id: generateId(),
        ruleId: 'content/scope-check',
        severity: 'warning',
        category: 'content',
        message: `Deep Analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        entryIds: [],
      }]
    }
  },
}

const missingVariationsRule: Rule = {
  id: 'keywords/missing-variations',
  name: 'Missing Keyword Variations',
  description: 'Uses AI to suggest natural keyword variations (nicknames, plurals, abbreviations) not covered by existing keywords.',
  category: 'keywords',
  severity: 'suggestion',
  requiresLLM: true,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const svc = getLLMService(context)
    const providerId = getActiveProviderId(context)
    if (!svc || !providerId) return []

    const entries = context.entries.filter(
      (e) => e.keys.length > 0 && !e.constant
    )
    if (entries.length === 0) return []

    const entrySummaries = entries
      .map((e) => `ID: ${e.id}\nName: ${e.name}\nKeywords: ${e.keys.join(', ')}`)
      .join('\n\n---\n\n')

    const systemPrompt = `You are a lorebook editor. For each entry's keywords, suggest natural variations that users might type in roleplay that aren't currently covered — such as nicknames, plurals, abbreviations, alternate spellings, or common phrases. Only suggest variations that have a realistic chance of appearing in roleplay text. Respond with valid JSON only.`

    const userMessage = `Review these lorebook entry keywords and suggest missing variations. Return a JSON array. Each object: entryId (string), missingVariations (string array of 1-5 suggestions).

Entries:
${entrySummaries}

Return format: [{"entryId": "...", "missingVariations": ["variation1", "variation2"]}]`

    try {
      const response = await svc.complete(providerId, {
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        responseFormat: 'json',
      })

      const parsed = JSON.parse(response.content) as { entryId: string; missingVariations: string[] }[]
      return parsed
        .filter((item) => item.missingVariations.length > 0)
        .map((item) => ({
          id: generateId(),
          ruleId: 'keywords/missing-variations',
          severity: 'suggestion' as const,
          category: 'keywords' as const,
          message: `Consider adding keyword variations: ${item.missingVariations.join(', ')}`,
          entryIds: [item.entryId],
          details: 'Adding natural variations ensures the entry activates when users reference it in different ways during roleplay.',
        }))
    } catch (err) {
      return [{
        id: generateId(),
        ruleId: 'keywords/missing-variations',
        severity: 'warning',
        category: 'keywords',
        message: `Deep Analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        entryIds: [],
      }]
    }
  },
}

export const llmRules: Rule[] = [
  qualityAssessmentRule,
  structureCheckRule,
  scopeCheckRule,
  missingVariationsRule,
]
