/**
 * CategorizeService — LLM-powered lorebook entry categorization.
 *
 * Pure functions, no state. Async.
 */

import type { WorkingEntry } from '../types'
import type { LLMService } from './llm/llm-service'
import { FIXED_CATEGORIES, isFixedCategory } from '../lib/entry-type'

const SYSTEM_PROMPT = `You are a lorebook entry categorizer. Given a lorebook entry name, content excerpt, and keywords, classify the entry into exactly one of the following categories: ${FIXED_CATEGORIES.join(', ')}.

Category definitions:
- character: A person, NPC, creature, or individual entity with personality or role
- location: A place, area, region, building, or geographic feature
- rule: A system rule, game mechanic, instruction, or behavioral guideline
- event: A happening, scene, plot event, or time-limited occurrence
- faction: An organization, group, guild, nation, or collective entity
- item: An object, artifact, weapon, tool, or possession
- lore: World history, mythology, background information, or general lore
- generic: Doesn't clearly fit any other category

Respond with valid JSON only: {"category": "<category-name>"}`

/**
 * Categorize a single entry using the LLM.
 * Returns one of the 8 fixed category strings, falling back to "generic" on failure.
 */
export async function categorizeEntry(
  entry: WorkingEntry,
  llmService: LLMService,
  providerId: string
): Promise<string> {
  const contentExcerpt = entry.content.slice(0, 500)
  const keywordsText = entry.keys.length > 0 ? entry.keys.slice(0, 10).join(', ') : '(none)'

  const userMessage = `Entry name: ${entry.name || '(unnamed)'}
Keywords: ${keywordsText}
Content: ${contentExcerpt}`

  try {
    const response = await llmService.complete(providerId, {
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 50,
      temperature: 0.1,
      responseFormat: 'json',
    })

    const parsed = JSON.parse(response.content.trim()) as unknown
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'category' in parsed &&
      typeof (parsed as Record<string, unknown>).category === 'string'
    ) {
      const cat = (parsed as { category: string }).category
      if (isFixedCategory(cat)) return cat
    }
  } catch {
    // Fall through to default
  }

  return 'generic'
}

/**
 * Categorize multiple entries sequentially, reporting progress.
 * Returns a map of entryId → category string.
 * Entries with existing userCategory are skipped if skipManualOverrides is true.
 */
export async function categorizeAll(
  entries: WorkingEntry[],
  llmService: LLMService,
  providerId: string,
  onProgress: (done: number, total: number) => void,
  skipManualOverrides = true
): Promise<Record<string, string>> {
  const toProcess = skipManualOverrides
    ? entries.filter((e) => !e.userCategory)
    : entries

  const results: Record<string, string> = {}
  let done = 0

  for (const entry of toProcess) {
    const category = await categorizeEntry(entry, llmService, providerId)
    results[entry.id] = category
    done++
    onProgress(done, toProcess.length)
  }

  return results
}
