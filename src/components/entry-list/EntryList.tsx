import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, ChevronDown, ChevronUp, CheckCheck, XCircle } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Tooltip } from '@/components/ui/Tooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { EntryListItem } from './EntryListItem'
import { Toggle } from '@/components/shared/Toggle'
import type { WorkingEntry, SortKey, FindingSeverity } from '@/types'

const SEVERITY_RANK: Record<FindingSeverity, number> = { error: 2, warning: 1, suggestion: 0 }

function compare(a: WorkingEntry, b: WorkingEntry, key: SortKey): number {
  switch (key) {
    case 'uid':          return a.uid - b.uid
    case 'name':         return a.name.localeCompare(b.name)
    case 'tokenCount':   return a.tokenCount - b.tokenCount
    case 'order':        return a.order - b.order
    case 'displayIndex': return (a.displayIndex ?? a.uid) - (b.displayIndex ?? b.uid)
  }
}

interface EntryListProps {
  onOpenModal?: (entryId: string) => void
}

export function EntryList({ onOpenModal }: EntryListProps = {}) {
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
  const multiSelect = activeStore((s) => s.selection.multiSelect)
  const findings = activeStore((s) => s.findings)

  // Compute worst severity per entry — memoized to avoid O(n) rebuild on unrelated re-renders
  const entryWorstSeverity = useMemo(() => {
    const map = new Map<string, FindingSeverity>()
    for (const finding of findings) {
      for (const id of finding.entryIds) {
        const current = map.get(id)
        if (!current || SEVERITY_RANK[finding.severity] > SEVERITY_RANK[current]) {
          map.set(id, finding.severity)
        }
      }
    }
    return map
  }, [findings])

  function handleSelect(id: string) {
    realStore?.getState().selectEntry(id)
  }

  function handleMultiToggle(id: string) {
    realStore?.getState().toggleMultiSelect(id)
  }

  function handleShiftSelect(id: string) {
    if (!realStore) return
    const state = realStore.getState()
    // Find anchor: last item in multiSelect, or the currently selected item
    const anchor = state.selection.multiSelect[state.selection.multiSelect.length - 1]
      ?? state.selection.selectedEntryId
    if (!anchor) {
      realStore.getState().toggleMultiSelect(id)
      return
    }
    const allIds = sorted.map((e) => e.id)
    const anchorIdx = allIds.indexOf(anchor)
    const targetIdx = allIds.indexOf(id)
    if (anchorIdx === -1 || targetIdx === -1) {
      realStore.getState().toggleMultiSelect(id)
      return
    }
    const [lo, hi] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx]
    const rangeIds = allIds.slice(lo, hi + 1)
    for (const rid of rangeIds) {
      if (!state.selection.multiSelect.includes(rid)) {
        realStore.getState().toggleMultiSelect(rid)
      }
    }
  }

  function handleToggleEnabled(id: string) {
    const entry = entries.find((e) => e.id === id)
    if (entry) realStore?.getState().updateEntry(id, { enabled: !entry.enabled })
  }

  function handleSetCategory(entryId: string, category: string | undefined) {
    realStore?.getState().setEntryCategory(entryId, category)
  }

  function handleBulkEnable() {
    realStore?.getState().bulkEnable(multiSelect)
    realStore?.getState().clearMultiSelect()
  }

  function handleBulkDisable() {
    realStore?.getState().bulkDisable(multiSelect)
    realStore?.getState().clearMultiSelect()
  }

  function handleBulkDelete() {
    if (!window.confirm(`Delete ${multiSelect.length} selected entries?`)) return
    realStore?.getState().bulkRemove(multiSelect)
  }

  const listRef = useRef<HTMLDivElement>(null)

  const sorted = useMemo(() => {
    const filtered = search.trim()
      ? entries.filter((e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.content.toLowerCase().includes(search.toLowerCase()) ||
          e.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
        )
      : entries
    return [...filtered].sort((a, b) => {
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
  }, [entries, search, sortBy, sortDir, sortBy2, sortDir2, pinConstantsToTop])

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 36, // py-2 + text-sm + border-b ≈ 36px per row
    overscan: 5,
  })

  if (!activeTabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Open a lorebook to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-2 border-b border-ctp-surface0">
        <div className="flex items-center gap-2 px-2 py-1 bg-ctp-surface0 rounded text-xs">
          <Search size={12} className="text-ctp-subtext0 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="flex-1 bg-transparent text-ctp-subtext1 placeholder-ctp-overlay0 outline-none"
          />
        </div>
      </div>

      {/* Bulk action bar (shown when items are multi-selected) */}
      {multiSelect.length > 0 && (
        <div className="px-2 py-1.5 border-b border-ctp-surface0 bg-ctp-blue/10 flex items-center gap-1 flex-wrap">
          <span className="text-xs text-ctp-blue font-medium mr-1">{multiSelect.length} selected</span>
          <button
            onClick={handleBulkEnable}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-ctp-green/20 text-ctp-green border border-ctp-green/30 rounded hover:bg-ctp-green/30 transition-colors"
          >
            <CheckCheck size={10} />
            Enable
          </button>
          <button
            onClick={handleBulkDisable}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-ctp-yellow/20 text-ctp-yellow border border-ctp-yellow/30 rounded hover:bg-ctp-yellow/30 transition-colors"
          >
            Disable
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-ctp-red/20 text-ctp-red border border-ctp-red/30 rounded hover:bg-ctp-red/30 transition-colors"
          >
            Delete
          </button>
          <Tooltip text="Clear selection">
            <button
              onClick={() => realStore?.getState().clearMultiSelect()}
              className="ml-auto p-0.5 text-ctp-overlay1 hover:text-ctp-subtext1 transition-colors"
            >
              <XCircle size={13} />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Entry count + collapsible sort controls */}
      <div className="px-3 py-1 border-b border-ctp-surface0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ctp-overlay1">
            {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
          </span>
          <button
            onClick={() => setSortExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-ctp-overlay1 hover:text-ctp-subtext1 transition-colors"
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
                <span className="text-xs text-ctp-subtext0">Pin Constants</span>
                <HelpTooltip text="Float constant (always-active) entries to the top, ignoring sort order." />
              </div>
              <Toggle checked={pinConstantsToTop} onChange={setPinConstantsToTop} />
            </div>

            {/* Display metric */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-ctp-subtext0">Display</span>
                <HelpTooltip text="The number shown on each row — token count or insertion order." />
              </div>
              <div className="flex items-center rounded overflow-hidden border border-ctp-surface1 text-xs">
                <button
                  onClick={() => setDisplayMetric('tokens')}
                  className={`px-1.5 py-0.5 leading-none transition-colors ${displayMetric === 'tokens' ? 'text-ctp-accent bg-ctp-crust' : 'text-ctp-overlay1 hover:text-ctp-subtext1'}`}
                >
                  Tokens
                </button>
                <span className="text-ctp-surface1 leading-none select-none">|</span>
                <button
                  onClick={() => setDisplayMetric('order')}
                  className={`px-1.5 py-0.5 leading-none transition-colors ${displayMetric === 'order' ? 'text-ctp-accent bg-ctp-crust' : 'text-ctp-overlay1 hover:text-ctp-subtext1'}`}
                >
                  Order
                </button>
              </div>
            </div>

            {/* Primary sort */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-ctp-subtext0">Sort</span>
                <HelpTooltip text="Primary field to sort entries by." />
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-transparent text-xs text-ctp-subtext0 outline-none cursor-pointer hover:text-ctp-text transition-colors"
                >
                  <option value="uid">UID</option>
                  <option value="name">Name</option>
                  <option value="tokenCount">Tokens</option>
                  <option value="order">Order</option>
                  <option value="displayIndex">Display Index</option>
                </select>
                <Tooltip text={sortDir === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse'}>
                  <button
                    onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
                    className="text-ctp-overlay1 hover:text-ctp-subtext1 transition-colors leading-none w-4 text-center"
                  >
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Secondary sort */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-ctp-subtext0">Then</span>
                <HelpTooltip text="Tiebreaker field used when two entries share the same primary sort value." />
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy2 ?? ''}
                  onChange={(e) => setSortBy2(e.target.value === '' ? null : e.target.value as SortKey)}
                  className="bg-transparent text-xs text-ctp-subtext0 outline-none cursor-pointer hover:text-ctp-text transition-colors"
                >
                  <option value="">— none —</option>
                  <option value="uid">UID</option>
                  <option value="name">Name</option>
                  <option value="tokenCount">Tokens</option>
                  <option value="order">Order</option>
                  <option value="displayIndex">Display Index</option>
                </select>
                <Tooltip text={sortDir2 === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse'}>
                  <button
                    onClick={() => setSortDir2((d) => d === 'asc' ? 'desc' : 'asc')}
                    className={`leading-none transition-colors w-4 text-center ${sortBy2 === null ? 'text-ctp-surface1 cursor-default' : 'text-ctp-overlay1 hover:text-ctp-subtext1 cursor-pointer'}`}
                    disabled={sortBy2 === null}
                  >
                    {sortDir2 === 'asc' ? '↑' : '↓'}
                  </button>
                </Tooltip>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* List — windowed via @tanstack/react-virtual */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-ctp-overlay1">No entries found</p>
          </div>
        ) : (
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vItem) => {
              const entry = sorted[vItem.index]
              return (
                <div
                  key={entry.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  <EntryListItem
                    entry={entry}
                    isSelected={selectedId === entry.id}
                    isMultiSelected={multiSelect.includes(entry.id)}
                    onSelect={handleSelect}
                    onMultiToggle={handleMultiToggle}
                    onShiftSelect={handleShiftSelect}
                    onToggleEnabled={handleToggleEnabled}
                    onSetCategory={handleSetCategory}
                    onOpenModal={onOpenModal ? () => onOpenModal(entry.id) : undefined}
                    displayMetric={displayMetric}
                    severity={entryWorstSeverity.get(entry.id) ?? null}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
