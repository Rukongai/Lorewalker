import { useState, useMemo } from 'react'
import type { KeywordStat } from '@/types'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { buildKeywordInventory } from '@/services/keyword-analysis-service'
import { KeywordTable } from './KeywordTable'
import { KeywordDetailPane } from './KeywordDetailPane'

interface KeywordsTabContentProps {
  tabId: string | null
  onSelectEntry: (id: string) => void
  onOpenEntry: (id: string) => void
}

export function KeywordsTabContent({
  tabId,
  onSelectEntry,
  onOpenEntry: _onOpenEntry,
}: KeywordsTabContentProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)

  const [selected, setSelected] = useState<KeywordStat | null>(null)

  const stats = useMemo(() => buildKeywordInventory(entries), [entries])

  if (!tabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Open a lorebook to browse keywords</p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: keyword list */}
      <div className="w-80 shrink-0 border-r border-ctp-surface0 overflow-hidden flex flex-col">
        <div className="px-3 pt-3 pb-1 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
            Keywords{' '}
            <span className="text-ctp-overlay0">({stats.length})</span>
          </p>
        </div>
        <KeywordTable stats={stats} selected={selected} onSelect={setSelected} />
      </div>

      {/* Right: detail pane */}
      <div className="flex-1 overflow-hidden">
        <KeywordDetailPane
          key={selected ? `${selected.keyword}-${selected.isSecondary ? 'sec' : 'pri'}` : 'empty'}
          stat={selected}
          entries={entries}
          bookMeta={bookMeta}
          onSelectEntry={onSelectEntry}
        />
      </div>
    </div>
  )
}
