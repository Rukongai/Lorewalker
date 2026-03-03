import type { WorkingEntry, BookMeta, ActivationResult, KeywordStat } from '../types'
import { simulate } from './simulator-service'
import { isRegexKey } from './simulator/keyword-matching'

/**
 * Builds a deduplicated keyword inventory from all entries.
 * Combines entry.keys (isSecondary=false) and entry.secondaryKeys (isSecondary=true).
 * If the same keyword string appears as both primary and secondary, emits two rows.
 */
export function buildKeywordInventory(entries: WorkingEntry[]): KeywordStat[] {
  // Two separate maps: one for primary keys, one for secondary keys
  const primaryMap = new Map<string, string[]>()
  const secondaryMap = new Map<string, string[]>()

  for (const entry of entries) {
    for (const key of entry.keys) {
      const trimmed = key.trim()
      if (!trimmed) continue
      const existing = primaryMap.get(trimmed)
      if (existing) {
        existing.push(entry.id)
      } else {
        primaryMap.set(trimmed, [entry.id])
      }
    }
    for (const key of entry.secondaryKeys) {
      const trimmed = key.trim()
      if (!trimmed) continue
      const existing = secondaryMap.get(trimmed)
      if (existing) {
        existing.push(entry.id)
      } else {
        secondaryMap.set(trimmed, [entry.id])
      }
    }
  }

  const stats: KeywordStat[] = []

  for (const [keyword, entryIds] of primaryMap) {
    stats.push({ keyword, isRegex: isRegexKey(keyword), isSecondary: false, entryIds })
  }
  for (const [keyword, entryIds] of secondaryMap) {
    stats.push({ keyword, isRegex: isRegexKey(keyword), isSecondary: true, entryIds })
  }

  return stats
}

/**
 * Runs the full SillyTavernEngine with a synthetic single-message prompt.
 */
export function simulateKeyword(
  keyword: string,
  entries: WorkingEntry[],
  bookMeta: BookMeta,
): ActivationResult {
  return simulate(entries, {
    messages: [{ role: 'user', content: keyword }],
    scanDepth: bookMeta.scanDepth,
    tokenBudget: bookMeta.tokenBudget,
    caseSensitive: bookMeta.caseSensitive,
    matchWholeWords: bookMeta.matchWholeWords,
    maxRecursionSteps: bookMeta.maxRecursionSteps,
    includeNames: bookMeta.includeNames,
  })
}
