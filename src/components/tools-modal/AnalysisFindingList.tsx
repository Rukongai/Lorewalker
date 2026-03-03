import { HealthScoreCard } from '@/features/health/HealthScoreCard'
import { FindingsList } from '@/features/health/FindingsList'
import { DeepAnalysisTrigger } from '@/features/health/DeepAnalysisTrigger'
import type { AnalysisContext, Finding, HealthScore } from '@/types'

interface AnalysisFindingListProps {
  findings: Finding[]
  healthScore: HealthScore
  selectedRuleId: string | null
  hasLlmProvider: boolean
  providerId?: string
  context: AnalysisContext
  onSelectRule: (ruleId: string) => void
  onComplete: (findings: Finding[]) => void
}

export function AnalysisFindingList({
  findings,
  healthScore,
  selectedRuleId,
  hasLlmProvider,
  providerId,
  context,
  onSelectRule,
  onComplete,
}: AnalysisFindingListProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Health score header */}
      <div className="p-4 border-b border-ctp-surface0 shrink-0">
        <div className="mb-3">
          <HealthScoreCard score={healthScore.overall} summary={healthScore.summary} size="lg" />
        </div>

        <DeepAnalysisTrigger
          hasLlmProvider={hasLlmProvider}
          providerId={providerId}
          context={context}
          onComplete={onComplete}
        />
      </div>

      {/* Category accordion with rule items */}
      <div className="flex-1 overflow-hidden">
        <FindingsList
          findings={findings}
          groupByRule
          onSelectRule={onSelectRule}
          selectedRuleId={selectedRuleId}
        />
      </div>
    </div>
  )
}
