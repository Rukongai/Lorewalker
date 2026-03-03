import type { Rule, CustomRule, Finding, AnalysisContext } from '@/types'
import { generateId } from '@/lib/uuid'
import { evaluateCondition, interpolateMessage } from './evaluation-engine'
import type { EvaluationContext } from './evaluation-engine'

/**
 * Adapts a CustomRule to the Rule interface so it can run alongside default rubric rules.
 * Iterates all entries in the AnalysisContext and returns a Finding for each that matches.
 */
export function customRuleToRule(cr: CustomRule): Rule {
  return {
    id: `custom/${cr.id}`,
    name: cr.name,
    description: cr.description,
    category: cr.category,
    severity: cr.severity,
    requiresLLM: cr.requiresLLM,
    async evaluate(context: AnalysisContext): Promise<Finding[]> {
      if (!cr.enabled) return []

      // LLM rules are not evaluated here — they need LLM context
      if (cr.requiresLLM) return []

      if (!cr.evaluation || cr.evaluation.items.length === 0) return []

      const findings: Finding[] = []

      for (const entry of context.entries) {
        const ctx: EvaluationContext = { entry, book: context.bookMeta }
        const matches = evaluateCondition(cr.evaluation, ctx)
        if (matches) {
          findings.push({
            id: generateId(),
            ruleId: `custom/${cr.id}`,
            severity: cr.severity,
            category: cr.category,
            message: interpolateMessage(cr.message, ctx),
            entryIds: [entry.id],
          })
        }
      }

      return findings
    },
  }
}
