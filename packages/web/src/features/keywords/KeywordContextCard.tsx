import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import type { KeywordStat, WorkingEntry, BookMeta, ActivationResult } from '@/types'
import { simulateKeyword } from '@lorewalker/core'
import { ActivationResults } from '@/components/simulator/ActivationResults'

interface KeywordContextCardProps {
  stat: KeywordStat | null
  entries: WorkingEntry[]
  bookMeta: BookMeta
  onSelectEntry: (id: string) => void
}

export function KeywordContextCard({
  stat,
  entries,
  bookMeta,
  onSelectEntry,
}: KeywordContextCardProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ActivationResult | null>(null)

  if (!stat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay0">Select a keyword to explore</p>
      </div>
    )
  }

  function handleSimulate() {
    if (!stat) return
    setLoading(true)
    // Run synchronously (simulate is pure/sync), but wrap in setTimeout to allow loading state render
    setTimeout(() => {
      try {
        const r = simulateKeyword(stat.keyword, entries, bookMeta)
        setResult(r)
      } finally {
        setLoading(false)
      }
    }, 0)
  }

  const entryObjects = stat.entryIds
    .map((id) => entries.find((e) => e.id === id))
    .filter((e): e is WorkingEntry => e !== undefined)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-ctp-surface0 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {stat.isRegex && (
                <span className="text-[9px] bg-ctp-mauve/20 text-ctp-mauve rounded px-1.5 py-px font-medium">
                  regex
                </span>
              )}
              {stat.isSecondary && (
                <span className="text-[9px] bg-ctp-peach/20 text-ctp-peach rounded px-1.5 py-px font-medium">
                  secondary
                </span>
              )}
              {!stat.isSecondary && (
                <span className="text-[9px] bg-ctp-blue/20 text-ctp-blue rounded px-1.5 py-px font-medium">
                  primary
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-mono text-ctp-text break-all">{stat.keyword}</p>
          </div>
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-ctp-accent text-ctp-base rounded hover:bg-ctp-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Simulate
          </button>
        </div>
        <p className="mt-2 text-[10px] text-ctp-overlay1">
          Used by <span className="font-semibold text-ctp-subtext0">{stat.entryIds.length}</span>{' '}
          {stat.entryIds.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      {/* Entry chips */}
      <div className="px-4 py-3 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
          Entries
        </p>
        <div className="flex flex-wrap gap-1.5">
          {entryObjects.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry.id)}
              className="text-xs bg-ctp-surface1 text-ctp-text rounded px-2 py-1 hover:bg-ctp-surface2 transition-colors max-w-xs truncate"
            >
              {entry.name || entry.id}
            </button>
          ))}
        </div>
      </div>

      {/* Simulation results */}
      {result && (
        <div className="px-4 pb-4 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
            Simulation Results
          </p>
          <div className="bg-ctp-surface0 rounded">
            <ActivationResults result={result} entries={entries} onSelectEntry={onSelectEntry} />
          </div>
        </div>
      )}
    </div>
  )
}
