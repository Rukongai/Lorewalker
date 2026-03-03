import { useState, useMemo, useEffect } from 'react'
import type { WorkingEntry, BookMeta, KeywordStat, RecursionGraph } from '@/types'
import { buildKeywordInventory } from '@lorewalker/core'
import { KeywordContextCard } from './KeywordContextCard'
import { KeywordTag } from './KeywordTag'
import { KeywordReachTable } from './KeywordReachTable'

interface KeywordsViewProps {
  scope: 'lorebook' | 'entry'
  entries: WorkingEntry[]
  bookMeta?: BookMeta
  // Entry scope
  entry?: WorkingEntry
  graph?: RecursionGraph
  // Shared
  onEntrySelect?: (entryId: string) => void
  onEntryOpen?: (entryId: string) => void
  // Lorebook scope
  initialKeyword?: string | null
  onInitialKeywordConsumed?: () => void
}

const FALLBACK_BOOK_META: BookMeta = {
  name: '', description: '', scanDepth: 4, tokenBudget: 4096, contextSize: 200000,
  recursiveScan: false, caseSensitive: false, matchWholeWords: false, extensions: {},
  minActivations: 0, maxDepth: 0, maxRecursionSteps: 0, insertionStrategy: 'evenly',
  includeNames: false, useGroupScoring: false, alertOnOverflow: false, budgetCap: 0,
}

export function KeywordsView({
  scope, entries, bookMeta, entry, graph,
  onEntrySelect, initialKeyword, onInitialKeywordConsumed,
}: KeywordsViewProps) {
  const [selected, setSelected] = useState<KeywordStat | null>(null)
  const stats = useMemo(() => buildKeywordInventory(entries), [entries])

  useEffect(() => {
    if (scope !== 'lorebook' || !initialKeyword) return
    const match = stats.find((s) => s.keyword === initialKeyword) ?? null
    setSelected(match)
    onInitialKeywordConsumed?.()
  }, [initialKeyword]) // eslint-disable-line react-hooks/exhaustive-deps

  if (scope === 'entry') {
    if (!entry) return null
    return (
      <div className="flex flex-col gap-3 p-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1">
            Primary Keywords
          </p>
          <div className="flex flex-wrap gap-1">
            {entry.keys.length === 0
              ? <span className="text-xs text-ctp-overlay0">No primary keywords</span>
              : entry.keys.map((kw) => (
                  <KeywordTag key={kw} keyword={kw} variant="primary" onRemove={() => {}} />
                ))
            }
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1">
            Secondary Keywords
          </p>
          <div className="flex flex-wrap gap-1">
            {entry.secondaryKeys.length === 0
              ? <span className="text-xs text-ctp-overlay0">No secondary keywords</span>
              : entry.secondaryKeys.map((kw) => (
                  <KeywordTag key={kw} keyword={kw} variant="secondary" onRemove={() => {}} />
                ))
            }
          </div>
        </div>
        {graph && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1">
              Reach
            </p>
            <KeywordReachTable
              entryId={entry.id}
              graph={graph}
              entries={entries}
            />
          </div>
        )}
      </div>
    )
  }

  // Lorebook scope
  if (stats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay0">No keywords found in this lorebook</p>
      </div>
    )
  }

  const meta = bookMeta ?? FALLBACK_BOOK_META

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1">
          Keywords <span className="text-ctp-overlay0">({stats.length})</span>
        </p>
        <select
          value={selected?.keyword ?? ''}
          onChange={(e) => {
            const match = stats.find((s) => s.keyword === e.target.value) ?? null
            setSelected(match)
          }}
          className="w-full text-xs bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-ctp-text focus:outline-none focus:border-ctp-accent"
        >
          <option value="">— Select a keyword —</option>
          {stats.map((s) => (
            <option key={`${s.keyword}-${s.isSecondary}`} value={s.keyword}>
              {s.keyword} ({s.entryIds.length})
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <KeywordContextCard
          key={`${selected.keyword}-${selected.isSecondary ? 'sec' : 'pri'}`}
          stat={selected}
          entries={entries}
          bookMeta={meta}
          onSelectEntry={onEntrySelect ?? (() => undefined)}
        />
      )}
    </div>
  )
}
