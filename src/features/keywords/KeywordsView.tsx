import { useState, useMemo, useEffect } from 'react'
import type { WorkingEntry, BookMeta, KeywordStat, LorebookFormat } from '@/types'
import { buildKeywordInventory } from '@/services/keyword-analysis-service'
import { KeywordTable } from './KeywordTable'
import { KeywordContextCard } from './KeywordContextCard'
import { KeywordEditor } from './KeywordEditor'
import { KeywordObjectsEditor } from './KeywordObjectsEditor'

interface KeywordsViewProps {
  scope: 'lorebook' | 'entry'
  entries: WorkingEntry[]
  bookMeta?: BookMeta
  // Entry scope
  entry?: WorkingEntry
  activeFormat?: LorebookFormat
  onUpdateEntry?: (id: string, changes: Partial<WorkingEntry>) => void
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
  scope, entries, bookMeta, entry, activeFormat, onUpdateEntry,
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
    if (!entry || !onUpdateEntry) return null
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1">
            Primary Keywords
          </p>
          <KeywordEditor
            value={entry.keys}
            onChange={(keys) => onUpdateEntry(entry.id, { keys })}
            placeholder="Add primary keyword…"
            variant="primary"
          />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1">
            Secondary Keywords
          </p>
          <KeywordEditor
            value={entry.secondaryKeys}
            onChange={(secondaryKeys) => onUpdateEntry(entry.id, { secondaryKeys })}
            placeholder="Add secondary keyword…"
            variant="secondary"
          />
        </div>
        {activeFormat === 'rolecall' && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1">
              Keyword Objects (RoleCall)
            </p>
            <KeywordObjectsEditor
              keywords={entry.keywordObjects ?? []}
              onChange={(keywordObjects) => onUpdateEntry(entry.id, { keywordObjects })}
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
    <div className="flex h-full overflow-hidden">
      <div className="w-80 shrink-0 border-r border-ctp-surface0 overflow-hidden flex flex-col">
        <div className="px-3 pt-3 pb-1 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
            Keywords <span className="text-ctp-overlay0">({stats.length})</span>
          </p>
        </div>
        <KeywordTable stats={stats} selected={selected} onSelect={setSelected} />
      </div>
      <div className="flex-1 overflow-hidden">
        <KeywordContextCard
          key={selected ? `${selected.keyword}-${selected.isSecondary ? 'sec' : 'pri'}` : 'empty'}
          stat={selected}
          entries={entries}
          bookMeta={meta}
          onSelectEntry={onEntrySelect ?? (() => undefined)}
        />
      </div>
    </div>
  )
}
