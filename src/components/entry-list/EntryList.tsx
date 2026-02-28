import { useState } from 'react'
import { Search } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EntryListItem } from './EntryListItem'
import type { WorkingEntry } from '@/types'

export function EntryList() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const [search, setSearch] = useState('')

  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const entries: WorkingEntry[] = store ? store((s) => s.entries) : []
  const selectedId = store ? store((s) => s.selection.selectedEntryId) : null

  function handleSelect(id: string) {
    store?.getState().selectEntry(id)
  }

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        e.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
      )
    : entries

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
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-gray-600">No entries found</p>
          </div>
        ) : (
          filtered.map((entry) => (
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
