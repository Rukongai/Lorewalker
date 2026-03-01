import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ActivationResult, ActivatedEntry, WorkingEntry } from '@/types'
import { RecursionTrace } from './RecursionTrace'

interface ActivationResultsProps {
  result: ActivationResult
  entries: WorkingEntry[]
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

export function ActivationResults({ result, entries, onSelectEntry }: ActivationResultsProps) {
  const [skippedOpen, setSkippedOpen] = useState(false)
  const [recursionOpen, setRecursionOpen] = useState(false)

  const budgetPct = Math.round((result.totalTokens / (result.totalTokens + result.budgetRemaining || 1)) * 100)

  const constants = result.activatedEntries.filter((e) => e.activatedBy === 'constant')
  const keywords = result.activatedEntries.filter((e) => e.activatedBy === 'keyword')
  const recursion = result.activatedEntries.filter((e) => e.activatedBy === 'recursion')

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Summary */}
      <div className="px-3 pt-2">
        <p className="text-xs text-ctp-subtext0">
          <span className="font-semibold text-ctp-text">{result.activatedEntries.length}</span> entries activated
          {' · '}
          <span className="font-semibold text-ctp-text">{result.totalTokens}</span> tokens
          {' · '}
          <span className={result.budgetExhausted ? 'text-ctp-red font-semibold' : ''}>
            {budgetPct}% budget used
          </span>
        </p>

        {/* Budget bar */}
        <div className="mt-1.5 h-1.5 bg-ctp-surface1 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${result.budgetExhausted ? 'bg-ctp-red' : 'bg-ctp-accent'}`}
            style={{ width: `${Math.min(100, budgetPct)}%` }}
          />
        </div>
      </div>

      {/* Activated entries */}
      {result.activatedEntries.length > 0 && (
        <div className="px-3 flex flex-col gap-1">
          {constants.length > 0 && <SectionLabel label="Constant" />}
          {constants.map((ae) => (
            <EntryRow key={ae.entryId} ae={ae} entries={entries} onSelect={onSelectEntry} />
          ))}

          {keywords.length > 0 && <SectionLabel label="Keyword-triggered" />}
          {keywords.map((ae) => (
            <EntryRow key={ae.entryId} ae={ae} entries={entries} onSelect={onSelectEntry} />
          ))}

          {recursion.length > 0 && <SectionLabel label="Recursion-triggered" />}
          {recursion.map((ae) => (
            <EntryRow key={ae.entryId} ae={ae} entries={entries} onSelect={onSelectEntry} />
          ))}
        </div>
      )}

      {/* Recursion trace */}
      {result.recursionTrace.length > 0 && (
        <div>
          <button
            onClick={() => setRecursionOpen((o) => !o)}
            className="w-full px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 hover:text-ctp-subtext0 transition-colors"
          >
            {recursionOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Recursion Trace ({result.recursionTrace.length} step{result.recursionTrace.length !== 1 ? 's' : ''})
          </button>
          {recursionOpen && (
            <RecursionTrace steps={result.recursionTrace} entries={entries} />
          )}
        </div>
      )}

      {/* Skipped entries */}
      {result.skippedEntries.length > 0 && (
        <div>
          <button
            onClick={() => setSkippedOpen((o) => !o)}
            className="w-full px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 hover:text-ctp-subtext0 transition-colors"
          >
            {skippedOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Skipped ({result.skippedEntries.length})
          </button>
          {skippedOpen && (
            <div className="px-3 flex flex-col gap-1">
              {result.skippedEntries.map((se, i) => (
                <button
                  key={`${se.entryId}-${i}`}
                  onClick={() => onSelectEntry(se.entryId)}
                  className="flex items-center justify-between gap-2 text-left hover:bg-ctp-surface0 rounded px-1 py-0.5 transition-colors"
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
  onSelect,
}: {
  ae: ActivatedEntry
  entries: WorkingEntry[]
  onSelect: (id: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(ae.entryId)}
      className="flex items-center justify-between gap-2 text-left hover:bg-ctp-surface0 rounded px-1 py-0.5 transition-colors"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-[9px] px-1.5 py-px rounded font-medium whitespace-nowrap ${ACTIVATED_BY_BADGE[ae.activatedBy]}`}>
          {ae.activatedBy}
        </span>
        <span className="text-xs text-ctp-text truncate">{entryName(entries, ae.entryId)}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {ae.matchedKeywords.map((kw, i) => (
          <span key={i} className="text-[9px] bg-ctp-surface1 text-ctp-subtext0 rounded px-1 py-px">
            {kw}
          </span>
        ))}
        <span className="text-[9px] text-ctp-overlay1 tabular-nums">{ae.tokenCost}t</span>
      </div>
    </button>
  )
}
