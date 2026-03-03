import { Tooltip } from '@/components/ui/Tooltip'
import { HealthScoreCard } from '@/features/health/HealthScoreCard'
import { FindingsList } from '@/features/health/FindingsList'
import type { Finding, HealthScore } from '@/types'

interface AnalysisFindingListProps {
  findings: Finding[]
  healthScore: HealthScore
  selectedRuleId: string | null
  hasLlmProvider: boolean
  onSelectRule: (ruleId: string) => void
  onDeepAnalysis: () => void
}

export function AnalysisFindingList({
  findings,
  healthScore,
  selectedRuleId,
  hasLlmProvider,
  onSelectRule,
  onDeepAnalysis,
}: AnalysisFindingListProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Health score header */}
      <div className="p-4 border-b border-ctp-surface0 shrink-0">
        <div className="mb-3">
          <HealthScoreCard score={healthScore.overall} summary={healthScore.summary} size="lg" />
        </div>

        <Tooltip text={hasLlmProvider ? 'Run AI-powered analysis' : 'Add a provider in Settings → Providers to enable'}>
          <button
            onClick={onDeepAnalysis}
            disabled={!hasLlmProvider}
            className="mt-2 px-3 py-1 rounded text-xs bg-ctp-accent text-ctp-base font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Deep Analysis
          </button>
        </Tooltip>
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
