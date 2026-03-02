import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import type { Finding, FindingSeverity, HealthScore, RuleCategory } from '@/types'

interface AnalysisFindingListProps {
  findings: Finding[]
  healthScore: HealthScore
  selectedFindingId: string | null
  hasLlmProvider: boolean
  onSelectFinding: (finding: Finding) => void
  onDeepAnalysis: () => void
}

type Filter = FindingSeverity | 'all'

const CATEGORIES: RuleCategory[] = ['structure', 'config', 'keywords', 'recursion', 'budget', 'content']

const SEVERITY_ORDER: Record<FindingSeverity, number> = { error: 0, warning: 1, suggestion: 2 }

const LLM_RULE_IDS = new Set([
  'content/quality-assessment',
  'content/structure-check',
  'content/scope-check',
  'keywords/missing-variations',
])

function scoreColor(score: number): string {
  if (score < 60) return 'text-ctp-red'
  if (score < 80) return 'text-ctp-yellow'
  return 'text-ctp-green'
}

function SeverityIcon({ severity }: { severity: FindingSeverity }) {
  if (severity === 'error') return <span className="text-ctp-red shrink-0">●</span>
  if (severity === 'warning') return <span className="text-ctp-yellow shrink-0">▲</span>
  return <span className="text-ctp-blue shrink-0">○</span>
}

function AiBadge() {
  return (
    <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-ctp-accent/20 text-ctp-accent leading-none">
      AI
    </span>
  )
}

export function AnalysisFindingList({
  findings,
  healthScore,
  selectedFindingId,
  hasLlmProvider,
  onSelectFinding,
  onDeepAnalysis,
}: AnalysisFindingListProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsedCats, setCollapsedCats] = useState<Set<RuleCategory>>(new Set())

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  const errorCount = sorted.filter((f) => f.severity === 'error').length
  const warningCount = sorted.filter((f) => f.severity === 'warning').length
  const suggestionCount = sorted.filter((f) => f.severity === 'suggestion').length

  const filtered = filter === 'all' ? sorted : sorted.filter((f) => f.severity === filter)

  function toggleCategory(cat: RuleCategory) {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Group by category
  const byCategory = new Map<RuleCategory, Finding[]>()
  for (const finding of filtered) {
    const cat = finding.category
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(finding)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Health score header */}
      <div className="p-4 border-b border-ctp-surface0 shrink-0">
        <div className="flex items-baseline gap-3 mb-1">
          <span className={`text-4xl font-bold tabular-nums ${scoreColor(healthScore.overall)}`}>
            {healthScore.overall}
          </span>
          <span className="text-sm text-ctp-subtext0 flex-1 leading-snug">{healthScore.summary}</span>
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

      {/* Severity filter bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-ctp-surface0 shrink-0 flex-wrap">
        {(['all', 'error', 'warning', 'suggestion'] as Filter[]).map((f) => {
          const count =
            f === 'all' ? sorted.length
            : f === 'error' ? errorCount
            : f === 'warning' ? warningCount
            : suggestionCount
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                active
                  ? 'bg-ctp-accent text-ctp-base'
                  : 'text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0'
              }`}
            >
              {f === 'all' ? `All (${count})` : f === 'error' ? `Errors (${count})` : f === 'warning' ? `Warnings (${count})` : `Hints (${count})`}
            </button>
          )
        })}
      </div>

      {/* Grouped finding list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-ctp-overlay1">
              {sorted.length === 0 ? 'No issues detected' : 'No findings match filter'}
            </p>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const catFindings = byCategory.get(cat)
            if (!catFindings || catFindings.length === 0) return null
            const collapsed = collapsedCats.has(cat)

            return (
              <div key={cat}>
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-ctp-surface0 border-b border-ctp-surface1 text-left hover:bg-ctp-surface1 transition-colors"
                >
                  {collapsed ? <ChevronRight size={11} className="text-ctp-overlay1 shrink-0" /> : <ChevronDown size={11} className="text-ctp-overlay1 shrink-0" />}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-subtext0 capitalize">
                    {cat}
                  </span>
                  <span className="ml-auto text-[10px] text-ctp-overlay1">{catFindings.length}</span>
                </button>

                {/* Findings in category */}
                {!collapsed && catFindings.map((finding) => (
                  <button
                    key={finding.id}
                    onClick={() => onSelectFinding(finding)}
                    className={`w-full flex items-start gap-2 px-3 py-2 text-left border-b border-ctp-surface0 last:border-b-0 transition-colors ${
                      finding.id === selectedFindingId
                        ? 'bg-ctp-surface1'
                        : 'hover:bg-ctp-surface0'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0"><SeverityIcon severity={finding.severity} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ctp-text leading-snug">{finding.message}</p>
                      <p className="text-[10px] text-ctp-overlay1 mt-0.5">{finding.ruleId}</p>
                    </div>
                    {LLM_RULE_IDS.has(finding.ruleId) && (
                      <span className="shrink-0 mt-0.5"><AiBadge /></span>
                    )}
                  </button>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
