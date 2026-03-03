import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { KeywordStat } from '@/types'
import { cn } from '@/lib/cn'

interface KeywordTableProps {
  stats: KeywordStat[]
  selected: KeywordStat | null
  onSelect: (s: KeywordStat) => void
}

type SortKey = 'keyword' | 'count'
type SortDir = 'asc' | 'desc'

export function KeywordTable({ stats, selected, onSelect }: KeywordTableProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('keyword')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showSecondary, setShowSecondary] = useState(true)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = stats
    .filter((s) => {
      if (!showSecondary && s.isSecondary) return false
      if (search) return s.keyword.toLowerCase().includes(search.toLowerCase())
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'keyword') {
        cmp = a.keyword.localeCompare(b.keyword)
      } else {
        cmp = a.entryIds.length - b.entryIds.length
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-3 pt-3 pb-2 flex flex-col gap-2 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter keywords…"
          className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-xs text-ctp-text placeholder:text-ctp-overlay0 focus:outline-none focus:border-ctp-accent"
        />
        <label className="flex items-center gap-1.5 text-xs text-ctp-subtext0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showSecondary}
            onChange={(e) => setShowSecondary(e.target.checked)}
            className="accent-ctp-accent"
          />
          Show secondary keys
        </label>
      </div>

      {/* Column headers */}
      <div className="px-3 pb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 shrink-0">
        <button
          onClick={() => toggleSort('keyword')}
          className="flex items-center gap-0.5 hover:text-ctp-subtext0 transition-colors flex-1"
        >
          Keyword
          {sortKey === 'keyword' && (
            sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
          )}
        </button>
        <button
          onClick={() => toggleSort('count')}
          className="flex items-center gap-0.5 hover:text-ctp-subtext0 transition-colors w-12 justify-end"
        >
          {sortKey === 'count' && (
            sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
          )}
          Entries
        </button>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-xs text-ctp-overlay0 text-center">No keywords found</p>
        )}
        {filtered.map((stat, i) => {
          const isSelected =
            selected?.keyword === stat.keyword && selected?.isSecondary === stat.isSecondary
          return (
            <button
              key={`${stat.keyword}-${stat.isSecondary ? 'sec' : 'pri'}-${i}`}
              onClick={() => onSelect(stat)}
              className={cn(
                'w-full px-3 py-1.5 flex items-center justify-between gap-2 text-left transition-colors',
                isSelected ? 'bg-ctp-surface1' : 'hover:bg-ctp-surface0',
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {stat.isRegex && (
                  <span className="text-[9px] bg-ctp-mauve/20 text-ctp-mauve rounded px-1 py-px font-medium shrink-0">
                    regex
                  </span>
                )}
                {stat.isSecondary && (
                  <span className="text-[9px] bg-ctp-peach/20 text-ctp-peach rounded px-1 py-px font-medium shrink-0">
                    2°
                  </span>
                )}
                <span className="text-xs text-ctp-text truncate font-mono">{stat.keyword}</span>
              </div>
              <span className="text-xs text-ctp-subtext0 tabular-nums shrink-0">
                {stat.entryIds.length}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
