import { useState } from 'react'
import { Search } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { EntryListItem } from './EntryListItem'
import type { WorkingEntry } from '@/types'

type SortMode = 'uid' | 'name' | 'tokenCount'

export function EntryList() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortMode>('uid')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries: WorkingEntry[] = activeStore((s) => s.entries)
  const selectedId = activeStore((s) => s.selection.selectedEntryId)

  function handleSelect(id: string) {
    realStore?.getState().selectEntry(id)
  }

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        e.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
      )
    : entries

  const sorted = [...filtered].sort((a, b) => {
    const cmp = (() => {
      switch (sortBy) {
        case 'uid':        return a.uid - b.uid
        case 'name':       return a.name.localeCompare(b.name)
        case 'tokenCount': return a.tokenCount - b.tokenCount
      }
    })()
    return sortDir === 'asc' ? cmp : -cmp
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

      {/* Entry count */}
      <div className="px-3 py-1 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
        </span>
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="bg-transparent text-xs text-gray-500 outline-none cursor-pointer hover:text-gray-300 transition-colors"
          >
            <option value="uid">Default</option>
            <option value="name">Name</option>
            <option value="tokenCount">Tokens</option>
          </select>
          <button
            onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
            className="text-gray-500 hover:text-gray-300 transition-colors leading-none"
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
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
            />
          ))
        )}
      </div>
    </div>
  )
}
