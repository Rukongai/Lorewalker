import type { AnalysisContext, Finding, Rubric, HealthScore, RuleCategory } from '@/types'
import { generateId } from '@/lib/uuid'

export async function runDeterministic(context: AnalysisContext, rubric: Rubric): Promise<Finding[]> {
  const deterministicRules = rubric.rules.filter((r) => !r.requiresLLM)
  const results = await Promise.all(deterministicRules.map((r) => r.evaluate(context)))
  return results.flat().map((f) => ({ ...f, id: f.id || generateId() }))
}

export function computeHealthScore(findings: Finding[], rubric: Rubric): HealthScore {
  const categories: RuleCategory[] = ['structure', 'config', 'keywords', 'content', 'recursion', 'budget']

  const categoryScores = Object.fromEntries(
    categories.map((cat) => {
      const catFindings = findings.filter((f) => f.category === cat)
      const errorCount = catFindings.filter((f) => f.severity === 'error').length
      const warningCount = catFindings.filter((f) => f.severity === 'warning').length
      const suggestionCount = catFindings.filter((f) => f.severity === 'suggestion').length
      const deduction = errorCount * 25 + warningCount * 10 + suggestionCount * 3
      return [cat, { score: Math.max(0, 100 - deduction), errorCount, warningCount, suggestionCount }]
    }),
  ) as Record<RuleCategory, { score: number; errorCount: number; warningCount: number; suggestionCount: number }>

  const totalWeight = Object.values(rubric.scoringWeights).reduce((a, b) => a + b, 0)
  const overall = Math.round(
    categories.reduce(
      (sum, cat) => sum + (categoryScores[cat].score * (rubric.scoringWeights[cat] ?? 0)),
      0,
    ) / totalWeight,
  )

  const errorCount = findings.filter((f) => f.severity === 'error').length
  const warningCount = findings.filter((f) => f.severity === 'warning').length
  const summary =
    errorCount > 0
      ? `${errorCount} error${errorCount !== 1 ? 's' : ''} require attention`
      : warningCount > 0
        ? `${warningCount} warning${warningCount !== 1 ? 's' : ''} found`
        : findings.length === 0
          ? 'No issues detected'
          : `${findings.length} suggestion${findings.length !== 1 ? 's' : ''}`

  return { overall, categories: categoryScores, summary }
}
