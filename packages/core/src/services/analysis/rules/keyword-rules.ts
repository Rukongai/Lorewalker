import type { Rule, Finding, AnalysisContext } from '../../../types/analysis'
import { generateId } from '../../../lib/uuid'

const GENERIC_KEYWORDS = new Set([
  'the', 'a', 'an', 'it', 'he', 'she', 'they', 'is', 'was', 'be',
  'magic', 'sword', 'weapon', 'item', 'place', 'location', 'person',
  'character', 'name',
])

const emptyKeysRule: Rule = {
  id: 'keywords/empty-keys',
  name: 'Empty Keywords',
  description: 'Checks for non-constant entries that have no keywords, which means they can never activate.',
  category: 'keywords',
  severity: 'error',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (!entry.constant && entry.keys.length === 0) {
        findings.push({
          id: generateId(),
          ruleId: 'keywords/empty-keys',
          severity: 'error',
          category: 'keywords',
          message: `Entry "${entry.name}" has no keywords and is not constant`,
          entryIds: [entry.id],
        })
      }
    }
    return findings
  },
}

const genericKeywordsRule: Rule = {
  id: 'keywords/generic-keywords',
  name: 'Generic Keywords',
  description: 'Checks for keywords that are too common and may cause unintended activations.',
  category: 'keywords',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      const matched = entry.keys.filter(k => GENERIC_KEYWORDS.has(k.trim().toLowerCase()))
      if (matched.length > 0) {
        findings.push({
          id: generateId(),
          ruleId: 'keywords/generic-keywords',
          severity: 'warning',
          category: 'keywords',
          message: `Entry "${entry.name}" uses generic keywords that may cause unintended activations: ${matched.join(', ')}`,
          entryIds: [entry.id],
        })
      }
    }
    return findings
  },
}

const overlySpecificRule: Rule = {
  id: 'keywords/overly-specific',
  name: 'Overly Specific Keywords',
  description: 'Checks for keywords containing more than 4 words, which may be too specific to reliably match.',
  category: 'keywords',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      const matched = entry.keys.filter(k => k.trim().split(/\s+/).length > 4)
      if (matched.length > 0) {
        findings.push({
          id: generateId(),
          ruleId: 'keywords/overly-specific',
          severity: 'suggestion',
          category: 'keywords',
          message: `Entry "${entry.name}" has keywords with too many words (may be too specific to match): ${matched.join(', ')}`,
          entryIds: [entry.id],
        })
      }
    }
    return findings
  },
}

const duplicateKeywordsRule: Rule = {
  id: 'keywords/duplicate-keywords',
  name: 'Duplicate Keywords',
  description: 'Checks for keywords shared by multiple entries, which may indicate redundancy or conflicts.',
  category: 'keywords',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    // Map from normalized keyword → array of entry IDs that have it
    const kwMap = new Map<string, string[]>()

    for (const entry of context.entries) {
      for (const key of entry.keys) {
        const normalized = key.trim().toLowerCase()
        const existing = kwMap.get(normalized)
        if (existing) {
          if (!existing.includes(entry.id)) {
            existing.push(entry.id)
          }
        } else {
          kwMap.set(normalized, [entry.id])
        }
      }
    }

    const entryNameMap = new Map(context.entries.map((e) => [e.id, e.name]))

    // Invert: for each entry, collect its duplicate keywords and the other entries that share them
    const entryDuplicates = new Map<string, Array<{ keyword: string; otherIds: string[] }>>()
    for (const [kw, ids] of kwMap) {
      if (ids.length < 2) continue
      for (const entryId of ids) {
        const otherIds = ids.filter((id) => id !== entryId)
        const existing = entryDuplicates.get(entryId)
        if (existing) {
          existing.push({ keyword: kw, otherIds })
        } else {
          entryDuplicates.set(entryId, [{ keyword: kw, otherIds }])
        }
      }
    }

    for (const [entryId, dupes] of entryDuplicates) {
      const entryName = entryNameMap.get(entryId) ?? entryId
      const n = dupes.length
      const allOtherIds = [...new Set(dupes.flatMap((d) => d.otherIds))]
      const detailLines = dupes.map(({ keyword, otherIds }) => {
        const otherNames = otherIds.map((id) => entryNameMap.get(id) ?? id)
        return `'${keyword}' — also on: ${otherNames.join(', ')}`
      })
      findings.push({
        id: generateId(),
        ruleId: 'keywords/duplicate-keywords',
        severity: 'warning',
        category: 'keywords',
        message: `Entry "${entryName}" has ${n} keyword(s) shared with other entries`,
        details: detailLines.join('\n'),
        entryIds: [entryId, ...allOtherIds],
        relatedKeywords: dupes.map((d) => d.keyword),
      })
    }

    return findings
  },
}

const substringOverlapRule: Rule = {
  id: 'keywords/substring-overlap',
  name: 'Keyword Substring Overlap',
  description: 'Checks for keywords where one is a strict substring of another, which may indicate imprecise keyword design.',
  category: 'keywords',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []

    const entryNameMap = new Map(context.entries.map((e) => [e.id, e.name]))

    // Collect all (entryId, normalizedKey, matchWholeWords) pairs
    const allKeys: Array<{ entryId: string; key: string; matchWholeWords: boolean }> = []
    for (const entry of context.entries) {
      const matchWholeWords = entry.matchWholeWords ?? context.bookMeta.matchWholeWords
      for (const key of entry.keys) {
        allKeys.push({ entryId: entry.id, key: key.trim().toLowerCase(), matchWholeWords })
      }
    }

    // For each entry, collect its keywords that are strict substrings of another entry's keyword
    // Map: entryId → list of { substringKey, superKeyword, otherEntryId }
    const entryOverlaps = new Map<string, Array<{ substringKey: string; superKeyword: string; otherEntryId: string }>>()

    for (let i = 0; i < allKeys.length; i++) {
      for (let j = 0; j < allKeys.length; j++) {
        if (i === j) continue
        const a = allKeys[i]
        const b = allKeys[j]
        // If 'a' uses whole-word matching, it won't fire word-internally inside 'b'
        // (word boundaries prevent substring activation), so no overlap concern.
        if (a.matchWholeWords) continue
        // a.key is a strict substring of b.key, from potentially different entries
        if (a.key !== b.key && b.key.includes(a.key)) {
          const existing = entryOverlaps.get(a.entryId)
          const overlap = { substringKey: a.key, superKeyword: b.key, otherEntryId: b.entryId }
          if (existing) {
            existing.push(overlap)
          } else {
            entryOverlaps.set(a.entryId, [overlap])
          }
        }
      }
    }

    for (const [entryId, overlaps] of entryOverlaps) {
      const entryName = entryNameMap.get(entryId) ?? entryId
      // Deduplicate: unique (substringKey, superKeyword, otherEntryId) triples
      const seen = new Set<string>()
      const uniqueOverlaps = overlaps.filter((o) => {
        const key = `${o.substringKey}|${o.superKeyword}|${o.otherEntryId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      const n = new Set(uniqueOverlaps.map((o) => o.substringKey)).size
      const allOtherIds = [...new Set(uniqueOverlaps.map((o) => o.otherEntryId))]
      const detailLines = uniqueOverlaps.map(({ substringKey, superKeyword, otherEntryId }) => {
        const otherName = entryNameMap.get(otherEntryId) ?? otherEntryId
        return `'${substringKey}' is a substring of ${otherName}'s keyword '${superKeyword}'`
      })
      findings.push({
        id: generateId(),
        ruleId: 'keywords/substring-overlap',
        severity: 'warning',
        category: 'keywords',
        message: `Entry "${entryName}" has ${n} keyword(s) that are substrings of other entries' keywords`,
        details: detailLines.join('\n'),
        entryIds: [entryId, ...allOtherIds],
        relatedKeywords: [...new Set(uniqueOverlaps.map((o) => o.substringKey))],
      })
    }

    return findings
  },
}

const keywordCountRule: Rule = {
  id: 'keywords/keyword-count',
  name: 'Keyword Count',
  description: 'Checks that non-constant entries have between 2 and 5 keywords for reliable, targeted activation.',
  category: 'keywords',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.constant) continue
      const n = entry.keys.length
      if (n < 2 || n > 5) {
        findings.push({
          id: generateId(),
          ruleId: 'keywords/keyword-count',
          severity: 'suggestion',
          category: 'keywords',
          message: `Entry "${entry.name}" has ${n} keyword(s); 2–5 is recommended`,
          entryIds: [entry.id],
        })
      }
    }
    return findings
  },
}

const redundantConstantKeysRule: Rule = {
  id: 'keywords/redundant-constant-keys',
  name: 'Redundant Constant Keywords',
  description: 'Checks for constant entries that also define keywords, which serve no direct activation purpose.',
  category: 'keywords',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.constant === true && entry.keys.length > 0) {
        findings.push({
          id: generateId(),
          ruleId: 'keywords/redundant-constant-keys',
          severity: 'suggestion',
          category: 'keywords',
          message: `Entry "${entry.name}" is constant but has keywords; they serve no direct activation purpose`,
          entryIds: [entry.id],
        })
      }
    }
    return findings
  },
}

export const keywordRules: Rule[] = [
  emptyKeysRule,
  genericKeywordsRule,
  overlySpecificRule,
  duplicateKeywordsRule,
  substringOverlapRule,
  keywordCountRule,
  redundantConstantKeysRule,
]
