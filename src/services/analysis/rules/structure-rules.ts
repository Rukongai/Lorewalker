import type { Rule, Finding, AnalysisContext } from '@/types/analysis'
import { generateId } from '@/lib/uuid'

const blankNameRule: Rule = {
  id: 'structure/blank-name',
  name: 'Blank Entry Name',
  description: 'Checks for entries with an empty or whitespace-only name, which makes them hard to identify in the editor.',
  category: 'structure',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (!entry.name || entry.name.trim().length === 0) {
        findings.push({
          id: generateId(),
          ruleId: 'structure/blank-name',
          severity: 'warning',
          category: 'structure',
          message: `Entry has an empty or whitespace-only name.`,
          entryIds: [entry.id],
          details: 'Entries without names are difficult to identify and manage. Assign a descriptive name to this entry.',
        })
      }
    }
    return findings
  },
}

const uidConsistencyRule: Rule = {
  id: 'structure/uid-consistency',
  name: 'Duplicate UID',
  description: 'Checks for entries sharing the same uid value (uid=0 on multiple entries is acceptable; positive uid values must be unique).',
  category: 'structure',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    const uidMap = new Map<number, string[]>()

    for (const entry of context.entries) {
      if (entry.uid > 0) {
        const existing = uidMap.get(entry.uid)
        if (existing) {
          existing.push(entry.id)
        } else {
          uidMap.set(entry.uid, [entry.id])
        }
      }
    }

    for (const [uid, ids] of uidMap) {
      if (ids.length > 1) {
        findings.push({
          id: generateId(),
          ruleId: 'structure/uid-consistency',
          severity: 'warning',
          category: 'structure',
          message: `${ids.length} entries share uid ${uid}. UIDs must be unique across the lorebook.`,
          entryIds: ids,
          details: `uid ${uid} appears on ${ids.length} entries. Duplicate UIDs can cause unexpected behavior when the lorebook is loaded by an AI platform.`,
        })
      }
    }

    return findings
  },
}

const fieldTypesRule: Rule = {
  id: 'structure/field-types',
  name: 'Field Value Out of Range',
  description: 'Checks that position is 0–7, probability is 1–100, and order is not negative.',
  category: 'structure',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []

    for (const entry of context.entries) {
      const problems: string[] = []

      if (entry.position < 0 || entry.position > 7) {
        problems.push(`position is ${entry.position} (expected 0–7)`)
      }
      if (entry.probability < 1 || entry.probability > 100) {
        problems.push(`probability is ${entry.probability} (expected 1–100)`)
      }
      if (entry.order < 0) {
        problems.push(`order is ${entry.order} (must be ≥ 0)`)
      }

      if (problems.length > 0) {
        findings.push({
          id: generateId(),
          ruleId: 'structure/field-types',
          severity: 'warning',
          category: 'structure',
          message: `Entry "${entry.name}" has out-of-range field values: ${problems.join('; ')}.`,
          entryIds: [entry.id],
          details: `Out-of-range values may be ignored or cause errors on AI platforms. Correct the listed fields to valid ranges.`,
        })
      }
    }

    return findings
  },
}

export const structureRules: Rule[] = [
  blankNameRule,
  uidConsistencyRule,
  fieldTypesRule,
]
