import { cn } from '@/lib/cn'
import type { WorkingEntry } from '@/types'

interface EntryListItemProps {
  entry: WorkingEntry
  isSelected: boolean
  onSelect: (id: string) => void
}

function getTypeBadge(entry: WorkingEntry): { label: string; color: string } {
  if (!entry.enabled) return { label: 'OFF', color: 'bg-gray-700 text-gray-400' }
  if (entry.constant) return { label: 'CONST', color: 'bg-purple-900/60 text-purple-300' }
  if (entry.selective) return { label: 'SEL', color: 'bg-teal-900/60 text-teal-300' }
  if (entry.sticky > 0) return { label: 'STICKY', color: 'bg-blue-900/60 text-blue-300' }
  return { label: 'KW', color: 'bg-indigo-900/60 text-indigo-300' }
}

export function EntryListItem({ entry, isSelected, onSelect }: EntryListItemProps) {
  const badge = getTypeBadge(entry)

  return (
    <button
      onClick={() => onSelect(entry.id)}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left border-b border-gray-800/50 transition-colors text-sm',
        isSelected
          ? 'bg-indigo-900/30 text-gray-100'
          : 'text-gray-300 hover:bg-gray-800/50',
        !entry.enabled && 'opacity-50'
      )}
    >
      {/* Type badge */}
      <span className={cn('text-[10px] font-mono px-1 py-0.5 rounded shrink-0', badge.color)}>
        {badge.label}
      </span>

      {/* Name */}
      <span className="flex-1 truncate text-xs">{entry.name || <em className="text-gray-500">Untitled</em>}</span>

      {/* Token count */}
      <span className="text-[10px] text-gray-600 shrink-0">{entry.tokenCount}t</span>
    </button>
  )
}
