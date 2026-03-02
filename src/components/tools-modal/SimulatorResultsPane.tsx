import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ActivationResult, ActivatedEntry, WorkingEntry } from '@/types'
import { RecursionTrace } from '@/components/simulator/RecursionTrace'

interface SimulatorResultsPaneProps {
  result: ActivationResult | null
  entries: WorkingEntry[]
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
}

function entryName(entries: WorkingEntry[], id: string): string {
  return entries.find((e) => e.id === id)?.name ?? id
}

const ACTIVATED_BY_BADGE: Record<ActivatedEntry['activatedBy'], string> = {
  constant: 'bg-ctp-yellow/20 text-ctp-yellow',
  keyword: 'bg-ctp-blue/20 text-ctp-blue',
  recursion: 'bg-ctp-mauve/20 text-ctp-mauve',
}

const SKIP_REASON_BADGE: Record<string, string> = {
  'budget-exhausted': 'bg-ctp-red/20 text-ctp-red',
  'probability-failed': 'bg-ctp-peach/20 text-ctp-peach',
  cooldown: 'bg-ctp-surface2 text-ctp-subtext0',
  delay: 'bg-ctp-surface2 text-ctp-subtext0',
  disabled: 'bg-ctp-overlay0/20 text-ctp-overlay0',
}

export function SimulatorResultsPane({
  result,
  entries,
  onOpenEntry,
  onSelectEntry,
}: SimulatorResultsPaneProps) {
  const [skippedOpen, setSkippedOpen] = useState(false)
  const [recursionOpen, setRecursionOpen] = useState(false)

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm text-ctp-overlay1">Run a simulation to see results</p>
      </div>
    )
  }

  const budgetTotal = result.totalTokens + result.budgetRemaining
  const budgetPct = budgetTotal > 0 ? Math.round((result.totalTokens / budgetTotal) * 100) : 0

  const constants = result.activatedEntries.filter((e) => e.activatedBy === 'constant')
  const keywords = result.activatedEntries.filter((e) => e.activatedBy === 'keyword')
  const recursion = result.activatedEntries.filter((e) => e.activatedBy === 'recursion')

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Summary bar */}
      <div className="px-4 py-3 border-b border-ctp-surface0 shrink-0">
        <div className="flex items-center gap-4 text-sm mb-2">
          <span className="text-ctp-subtext0">
            <span className="font-semibold text-ctp-text">{result.activatedEntries.length}</span> activated
          </span>
          <span className="text-ctp-subtext0">
            <span className="font-semibold text-ctp-text">{result.totalTokens}</span>
            {' / '}
            <span className={result.budgetExhausted ? 'text-ctp-red font-semibold' : 'text-ctp-subtext0'}>
              {budgetTotal}
            </span>
            {' tokens'}
          </span>
          {result.budgetExhausted && (
            <span className="text-xs text-ctp-red font-semibold">Budget exhausted</span>
          )}
        </div>
        <div className="h-1.5 bg-ctp-surface1 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${result.budgetExhausted ? 'bg-ctp-red' : 'bg-ctp-accent'}`}
            style={{ width: `${Math.min(100, budgetPct)}%` }}
          />
        </div>
        <p className="text-[10px] text-ctp-overlay1 mt-1 text-right tabular-nums">{budgetPct}% used</p>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Activated entries */}
        {result.activatedEntries.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
              Activated Entries
            </p>
            <div className="flex flex-col gap-1">
              {constants.length > 0 && <SectionLabel label="Constant" />}
              {constants.map((ae) => (
                <EntryRow key={ae.entryId} ae={ae} entries={entries} onOpenEntry={onOpenEntry} onSelectEntry={onSelectEntry} />
              ))}
              {keywords.length > 0 && <SectionLabel label="Keyword-triggered" />}
              {keywords.map((ae) => (
                <EntryRow key={ae.entryId} ae={ae} entries={entries} onOpenEntry={onOpenEntry} onSelectEntry={onSelectEntry} />
              ))}
              {recursion.length > 0 && <SectionLabel label="Recursion-triggered" />}
              {recursion.map((ae) => (
                <EntryRow key={ae.entryId} ae={ae} entries={entries} onOpenEntry={onOpenEntry} onSelectEntry={onSelectEntry} />
              ))}
            </div>
          </div>
        )}

        {/* Skipped entries */}
        {result.skippedEntries.length > 0 && (
          <div>
            <button
              onClick={() => setSkippedOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 hover:text-ctp-subtext0 transition-colors mb-1"
            >
              {skippedOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Skipped ({result.skippedEntries.length})
            </button>
            {skippedOpen && (
              <div className="flex flex-col gap-1">
                {result.skippedEntries.map((se, i) => (
                  <button
                    key={`${se.entryId}-${i}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey) onSelectEntry(se.entryId)
                      else onOpenEntry(se.entryId)
                    }}
                    className="flex items-center justify-between gap-2 text-left hover:bg-ctp-surface0 rounded px-2 py-1 transition-colors"
                  >
                    <span className="text-xs text-ctp-text truncate">{entryName(entries, se.entryId)}</span>
                    <span className={`text-[9px] px-1.5 py-px rounded font-medium whitespace-nowrap ${SKIP_REASON_BADGE[se.reason] ?? ''}`}>
                      {se.reason}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recursion trace */}
        {result.recursionTrace.length > 0 && (
          <div>
            <button
              onClick={() => setRecursionOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 hover:text-ctp-subtext0 transition-colors mb-1"
            >
              {recursionOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Recursion Trace ({result.recursionTrace.length} step{result.recursionTrace.length !== 1 ? 's' : ''})
            </button>
            {recursionOpen && (
              <RecursionTrace steps={result.recursionTrace} entries={entries} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-wider text-ctp-overlay1 mt-1">{label}</p>
  )
}

function EntryRow({
  ae,
  entries,
  onOpenEntry,
  onSelectEntry,
}: {
  ae: ActivatedEntry
  entries: WorkingEntry[]
  onOpenEntry: (id: string) => void
  onSelectEntry: (id: string) => void
}) {
  return (
    <button
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) onSelectEntry(ae.entryId)
        else onOpenEntry(ae.entryId)
      }}
      title="Click to open in editor · Cmd/Ctrl+click to select in list"
      className="flex items-center justify-between gap-2 text-left hover:bg-ctp-surface0 rounded px-2 py-1.5 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[9px] px-1.5 py-px rounded font-medium whitespace-nowrap ${ACTIVATED_BY_BADGE[ae.activatedBy]}`}>
          {ae.activatedBy}
        </span>
        <span className="text-sm text-ctp-text truncate">{entryName(entries, ae.entryId)}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {ae.matchedKeywords.slice(0, 3).map((kw, i) => (
          <span key={i} className="text-[9px] bg-ctp-surface1 text-ctp-subtext0 rounded px-1 py-px">
            {kw}
          </span>
        ))}
        {ae.matchedKeywords.length > 3 && (
          <span className="text-[9px] text-ctp-overlay1">+{ae.matchedKeywords.length - 3}</span>
        )}
        <span className="text-[10px] text-ctp-overlay1 tabular-nums ml-1">{ae.tokenCost}t</span>
      </div>
    </button>
  )
}
