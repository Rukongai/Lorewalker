import { useState } from 'react'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { FindingItem } from './FindingItem'
import type { FindingSeverity } from '@/types'

interface AnalysisPanelProps {
  tabId: string | null
}

type Filter = FindingSeverity | 'all'

function scoreColor(score: number): string {
  if (score < 60) return 'text-ctp-red'
  if (score < 80) return 'text-ctp-yellow'
  return 'text-ctp-green'
}

function scoreBarColor(score: number): string {
  if (score < 60) return 'bg-ctp-red'
  if (score < 80) return 'bg-ctp-yellow'
  return 'bg-ctp-green'
}

const CATEGORIES = ['structure', 'config', 'keywords', 'recursion', 'budget'] as const

export function AnalysisPanel({ tabId }: AnalysisPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const findings = activeStore((s) => s.findings)
  const healthScore = activeStore((s) => s.healthScore)

  const errorCount = findings.filter((f) => f.severity === 'error').length
  const warningCount = findings.filter((f) => f.severity === 'warning').length
  const suggestionCount = findings.filter((f) => f.severity === 'suggestion').length

  const filtered = filter === 'all' ? findings : findings.filter((f) => f.severity === filter)

  function handleSelectEntry(entryId: string) {
    realStore?.getState().selectEntry(entryId)
  }

  if (!tabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Open a lorebook to see analysis</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Score section */}
      <div className="p-3 border-b border-ctp-surface0 shrink-0 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold tabular-nums ${scoreColor(healthScore.overall)}`}>
            {healthScore.overall}
          </span>
          <span className="text-xs text-ctp-overlay1 flex-1">{healthScore.summary}</span>
        </div>

        {/* Per-category bars */}
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const catScore = healthScore.categories[cat]
            return (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-[10px] text-ctp-overlay1 w-16 shrink-0 capitalize">{cat}</span>
                <div className="flex-1 h-1 rounded bg-ctp-surface1 overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${scoreBarColor(catScore.score)}`}
                    style={{ width: `${catScore.score}%` }}
                  />
                </div>
                <span className="text-[10px] text-ctp-overlay1 w-6 text-right tabular-nums">{catScore.score}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-ctp-surface0 shrink-0">
        {(['all', 'error', 'warning', 'suggestion'] as Filter[]).map((f) => {
          const count = f === 'all' ? findings.length : f === 'error' ? errorCount : f === 'warning' ? warningCount : suggestionCount
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                active ? 'bg-ctp-accent text-ctp-base' : 'text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0'
              }`}
            >
              {f === 'all' ? `All ${count}` : f === 'error' ? `Error ${count}` : f === 'warning' ? `Warn ${count}` : `Hint ${count}`}
            </button>
          )
        })}
      </div>

      {/* Finding list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-ctp-overlay1">
              {findings.length === 0 ? 'No issues detected' : 'No findings match filter'}
            </p>
          </div>
        ) : (
          filtered.map((finding) => (
            <FindingItem
              key={finding.id}
              finding={finding}
              onSelectEntry={handleSelectEntry}
            />
          ))
        )}
      </div>
    </div>
  )
}
