import type { Rule, Finding, AnalysisContext } from '@/types/analysis'
import { generateId } from '@/lib/uuid'

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
          message: 'Entry has no keywords and is not constant',
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
          message: `Entry uses generic keywords that may cause unintended activations: ${matched.join(', ')}`,
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
          message: `Entry has keywords with too many words (may be too specific to match): ${matched.join(', ')}`,
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

    for (const [kw, ids] of kwMap) {
      if (ids.length > 1) {
        findings.push({
          id: generateId(),
          ruleId: 'keywords/duplicate-keywords',
          severity: 'warning',
          category: 'keywords',
          message: `Keyword '${kw}' is shared by multiple entries`,
          entryIds: ids,
        })
      }
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

    // Collect all (entryId, normalizedKey) pairs
    const allKeys: Array<{ entryId: string; key: string }> = []
    for (const entry of context.entries) {
      for (const key of entry.keys) {
        allKeys.push({ entryId: entry.id, key: key.trim().toLowerCase() })
      }
    }

    // Check every pair for strict substring relationship
    for (let i = 0; i < allKeys.length; i++) {
      for (let j = 0; j < allKeys.length; j++) {
        if (i === j) continue
        const a = allKeys[i]
        const b = allKeys[j]
        // a.key is a strict substring of b.key
        if (a.key !== b.key && b.key.includes(a.key)) {
          findings.push({
            id: generateId(),
            ruleId: 'keywords/substring-overlap',
            severity: 'warning',
            category: 'keywords',
            message: `Keyword '${a.key}' is a substring of '${b.key}'`,
            entryIds: [a.entryId, b.entryId],
          })
        }
      }
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
          message: `Entry has ${n} keyword(s); 2–5 is recommended`,
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
          message: 'Constant entry has keywords; they serve no direct activation purpose',
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
