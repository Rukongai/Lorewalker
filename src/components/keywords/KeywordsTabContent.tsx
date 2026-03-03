import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { KeywordsView } from '@/features/keywords/KeywordsView'

interface KeywordsTabContentProps {
  tabId: string | null
  onSelectEntry: (id: string) => void
  onOpenEntry: (id: string) => void
  initialKeyword?: string | null
  onInitialKeywordConsumed?: () => void
}

export function KeywordsTabContent({
  tabId, onSelectEntry, onOpenEntry, initialKeyword, onInitialKeywordConsumed,
}: KeywordsTabContentProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)

  if (!tabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Open a lorebook to browse keywords</p>
      </div>
    )
  }

  return (
    <KeywordsView
      scope="lorebook"
      entries={entries}
      bookMeta={bookMeta}
      onEntrySelect={onSelectEntry}
      onEntryOpen={onOpenEntry}
      initialKeyword={initialKeyword}
      onInitialKeywordConsumed={onInitialKeywordConsumed}
    />
  )
}
