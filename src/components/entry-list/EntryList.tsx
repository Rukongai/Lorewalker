import { useState } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { EntryListItem } from './EntryListItem'
import { Toggle } from '@/components/shared/Toggle'
import type { WorkingEntry, SortKey } from '@/types'

export function EntryList() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const entriesListDefaults = useWorkspaceStore((s) => s.entriesListDefaults)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(entriesListDefaults.sortBy)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(entriesListDefaults.sortDirection)
  const [sortBy2, setSortBy2] = useState<SortKey | null>(entriesListDefaults.sortBy2)
  const [sortDir2, setSortDir2] = useState<'asc' | 'desc'>(entriesListDefaults.sortDir2)
  const [pinConstantsToTop, setPinConstantsToTop] = useState(entriesListDefaults.pinConstantsToTop)
  const [displayMetric, setDisplayMetric] = useState<'tokens' | 'order'>('tokens')
  const [sortExpanded, setSortExpanded] = useState(false)

  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries: WorkingEntry[] = activeStore((s) => s.entries)
  const selectedId = activeStore((s) => s.selection.selectedEntryId)

  function handleSelect(id: string) {
    realStore?.getState().selectEntry(id)
  }

  function handleToggleEnabled(id: string) {
    const entry = entries.find((e) => e.id === id)
    if (entry) realStore?.getState().updateEntry(id, { enabled: !entry.enabled })
  }

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        e.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
      )
    : entries

  function compare(a: WorkingEntry, b: WorkingEntry, key: SortKey): number {
    switch (key) {
      case 'uid':          return a.uid - b.uid
      case 'name':         return a.name.localeCompare(b.name)
      case 'tokenCount':   return a.tokenCount - b.tokenCount
      case 'order':        return a.order - b.order
      case 'displayIndex': return (a.displayIndex ?? a.uid) - (b.displayIndex ?? b.uid)
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    if (pinConstantsToTop) {
      const pin = (b.constant ? 1 : 0) - (a.constant ? 1 : 0)
      if (pin !== 0) return pin
    }
    const cmp1 = compare(a, b, sortBy)
    const primary = sortDir === 'asc' ? cmp1 : -cmp1
    if (primary !== 0 || sortBy2 === null) return primary
    const cmp2 = compare(a, b, sortBy2)
    return sortDir2 === 'asc' ? cmp2 : -cmp2
  })

  if (!activeTabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-gray-600">Open a lorebook to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-2 border-b border-gray-800">
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 rounded text-xs">
          <Search size={12} className="text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 outline-none"
          />
        </div>
      </div>

      {/* Entry count + collapsible sort controls */}
      <div className="px-3 py-1 border-b border-gray-800 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
          </span>
          <button
            onClick={() => setSortExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {sortExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            <span>Sort Options</span>
          </button>
        </div>
        {sortExpanded && (
          <div className="flex flex-col gap-1.5 mt-1 pb-0.5">

            {/* Pin Constants */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Pin Constants</span>
                <HelpTooltip text="Float constant (always-active) entries to the top, ignoring sort order." />
              </div>
              <Toggle checked={pinConstantsToTop} onChange={setPinConstantsToTop} />
            </div>

            {/* Display metric */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Display</span>
                <HelpTooltip text="The number shown on each row — token count or insertion order." />
              </div>
              <div className="flex items-center rounded overflow-hidden border border-gray-700 text-xs">
                <button
                  onClick={() => setDisplayMetric('tokens')}
                  className={`px-1.5 py-0.5 leading-none transition-colors ${displayMetric === 'tokens' ? 'text-indigo-400 bg-indigo-950' : 'text-gray-600 hover:text-gray-400'}`}
                >
                  Tokens
                </button>
                <span className="text-gray-700 leading-none select-none">|</span>
                <button
                  onClick={() => setDisplayMetric('order')}
                  className={`px-1.5 py-0.5 leading-none transition-colors ${displayMetric === 'order' ? 'text-indigo-400 bg-indigo-950' : 'text-gray-600 hover:text-gray-400'}`}
                >
                  Order
                </button>
              </div>
            </div>

            {/* Primary sort */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Sort</span>
                <HelpTooltip text="Primary field to sort entries by." />
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-transparent text-xs text-gray-400 outline-none cursor-pointer hover:text-gray-200 transition-colors"
                >
                  <option value="uid">UID</option>
                  <option value="name">Name</option>
                  <option value="tokenCount">Tokens</option>
                  <option value="order">Order</option>
                  <option value="displayIndex">Display Index</option>
                </select>
                <button
                  onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
                  className="text-gray-500 hover:text-gray-300 transition-colors leading-none w-4 text-center"
                  title={sortDir === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse'}
                >
                  {sortDir === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Secondary sort */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Then</span>
                <HelpTooltip text="Tiebreaker field used when two entries share the same primary sort value." />
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy2 ?? ''}
                  onChange={(e) => setSortBy2(e.target.value === '' ? null : e.target.value as SortKey)}
                  className="bg-transparent text-xs text-gray-400 outline-none cursor-pointer hover:text-gray-200 transition-colors"
                >
                  <option value="">— none —</option>
                  <option value="uid">UID</option>
                  <option value="name">Name</option>
                  <option value="tokenCount">Tokens</option>
                  <option value="order">Order</option>
                  <option value="displayIndex">Display Index</option>
                </select>
                <button
                  onClick={() => setSortDir2((d) => d === 'asc' ? 'desc' : 'asc')}
                  className={`leading-none transition-colors w-4 text-center ${sortBy2 === null ? 'text-gray-700 cursor-default' : 'text-gray-500 hover:text-gray-300 cursor-pointer'}`}
                  title={sortDir2 === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse'}
                  disabled={sortBy2 === null}
                >
                  {sortDir2 === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-gray-600">No entries found</p>
          </div>
        ) : (
          sorted.map((entry) => (
            <EntryListItem
              key={entry.id}
              entry={entry}
              isSelected={selectedId === entry.id}
              onSelect={handleSelect}
              onToggleEnabled={handleToggleEnabled}
              displayMetric={displayMetric}
            />
          ))
        )}
      </div>
    </div>
  )
}
