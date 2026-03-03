import type { Rule, Finding, AnalysisContext } from '../../../types/analysis'
import { generateId } from '../../../lib/uuid'

const constantTokenCostRule: Rule = {
  id: 'budget/constant-token-cost',
  name: 'Constant Entry Token Cost',
  description: 'Checks for constant entries with a high token count, since they are always included in context.',
  category: 'budget',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.constant === true && entry.tokenCount > 100) {
        findings.push({
          id: generateId(),
          ruleId: 'budget/constant-token-cost',
          severity: 'warning',
          category: 'budget',
          message: `Entry "${entry.name}" uses ${entry.tokenCount} tokens (always included in context)`,
          entryIds: [entry.id],
        })
      }
    }
    return findings
  },
}

const entryTokenSizeRule: Rule = {
  id: 'budget/entry-token-size',
  name: 'Entry Token Size',
  description: 'Checks for entries that are very large (may bloat context) or very small (may lack useful content).',
  category: 'budget',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.tokenCount > 200) {
        findings.push({
          id: generateId(),
          ruleId: 'budget/entry-token-size',
          severity: 'warning',
          category: 'budget',
          message: `Entry "${entry.name}" is very large at ${entry.tokenCount} tokens`,
          entryIds: [entry.id],
        })
      } else if (entry.tokenCount < 30 && entry.tokenCount > 0) {
        findings.push({
          id: generateId(),
          ruleId: 'budget/entry-token-size',
          severity: 'suggestion',
          category: 'budget',
          message: `Entry "${entry.name}" is very small at ${entry.tokenCount} tokens (may lack useful context)`,
          entryIds: [entry.id],
        })
      }
    }
    return findings
  },
}

const totalConstantCostRule: Rule = {
  id: 'budget/total-constant-cost',
  name: 'Total Constant Entry Cost',
  description: 'Checks whether the combined token count of all constant entries exceeds 2000, which is always consumed from the context budget.',
  category: 'budget',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const total = context.entries
      .filter(e => e.constant === true)
      .reduce((sum, e) => sum + e.tokenCount, 0)

    if (total > 2000) {
      return [
        {
          id: generateId(),
          ruleId: 'budget/total-constant-cost',
          severity: 'warning',
          category: 'budget',
          message: `Constant entries total ${total} tokens (always included in context)`,
          entryIds: [],
        },
      ]
    }

    return []
  },
}

const constantCountRule: Rule = {
  id: 'budget/constant-count',
  name: 'Constant Entry Count',
  description: 'Checks whether more than 7 entries are marked constant, which guarantees they consume context on every turn.',
  category: 'budget',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const constantEntries = context.entries.filter(e => e.constant === true)
    const n = constantEntries.length

    if (n > 7) {
      return [
        {
          id: generateId(),
          ruleId: 'budget/constant-count',
          severity: 'warning',
          category: 'budget',
          message: `${n} constant entries will always be included in context`,
          entryIds: [],
        },
      ]
    }

    return []
  },
}

const ignoreBudgetUsageRule: Rule = {
  id: 'budget/ignore-budget-usage',
  name: 'Ignore Budget Usage',
  description: 'Checks for entries that bypass token budget limits, which can cause context overflow.',
  category: 'budget',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.ignoreBudget === true) {
        findings.push({
          id: generateId(),
          ruleId: 'budget/ignore-budget-usage',
          severity: 'warning',
          category: 'budget',
          message: `Entry "${entry.name}" ignores token budget limits`,
          entryIds: [entry.id],
        })
      }
    }
    return findings
  },
}

export const budgetRules: Rule[] = [
  constantTokenCostRule,
  entryTokenSizeRule,
  totalConstantCostRule,
  constantCountRule,
  ignoreBudgetUsageRule,
]
