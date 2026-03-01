import { cn } from '@/lib/cn'
import type { WorkingEntry } from '@/types'
import { Toggle } from '@/components/shared/Toggle'

interface EntryListItemProps {
  entry: WorkingEntry
  isSelected: boolean
  onSelect: (id: string) => void
  onToggleEnabled: (id: string) => void
  displayMetric: 'tokens' | 'order'
}

function getTypeBadge(entry: WorkingEntry): { label: string; color: string } {
  if (!entry.enabled) return { label: 'OFF', color: 'bg-gray-700 text-gray-400' }
  if (entry.constant) return { label: 'CONST', color: 'bg-purple-900/80 text-purple-300' }
  if (entry.selective) return { label: 'SEL', color: 'bg-teal-900/80 text-teal-300' }
  if (entry.sticky > 0) return { label: 'STICKY', color: 'bg-blue-900/80 text-blue-300' }
  return { label: 'KW', color: 'bg-indigo-900/80 text-indigo-300' }
}

export function EntryListItem({ entry, isSelected, onSelect, onToggleEnabled, displayMetric }: EntryListItemProps) {
  const badge = getTypeBadge(entry)

  return (
    <div
      onClick={() => onSelect(entry.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(entry.id) }}
      tabIndex={0}
      role="option"
      aria-selected={isSelected}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left border-b border-gray-800/50 transition-colors text-sm cursor-default',
        isSelected
          ? 'bg-indigo-900/30 text-gray-100'
          : 'text-gray-300 hover:bg-gray-800/50',
        !entry.enabled && 'opacity-50'
      )}
    >
      {/* Enable toggle */}
      <span onClick={(e) => e.stopPropagation()}>
        <Toggle
          checked={entry.enabled}
          onChange={() => onToggleEnabled(entry.id)}
          aria-label={entry.enabled ? 'Disable entry' : 'Enable entry'}
        />
      </span>

      {/* Name */}
      <span className="flex-1 truncate text-xs">{entry.name || <em className="text-gray-500">Untitled</em>}</span>

      {/* Type badge */}
      <span className={cn('text-[10px] font-mono px-1 py-0.5 rounded shrink-0', badge.color)}>
        {badge.label}
      </span>

      {/* Metric */}
      <span className="text-[10px] text-gray-500 shrink-0">
        {displayMetric === 'tokens' ? `${entry.tokenCount}t` : `${entry.order}`}
      </span>
    </div>
  )
}
