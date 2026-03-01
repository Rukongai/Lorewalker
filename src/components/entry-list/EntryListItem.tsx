import { cn } from '@/lib/cn'
import type { WorkingEntry, FindingSeverity } from '@/types'
import { Toggle } from '@/components/shared/Toggle'
import { severityColor } from '@/lib/severity-color'

interface EntryListItemProps {
  entry: WorkingEntry
  isSelected: boolean
  onSelect: (id: string) => void
  onToggleEnabled: (id: string) => void
  displayMetric: 'tokens' | 'order'
  severity: FindingSeverity | null
}

function getTypeBadge(entry: WorkingEntry): { label: string; color: string } {
  if (!entry.enabled) return { label: 'OFF', color: 'bg-ctp-surface1 text-ctp-overlay0 ring-1 ring-ctp-surface2' }
  if (entry.constant) return { label: 'CONST', color: 'bg-ctp-mauve/50 text-ctp-mauve ring-1 ring-ctp-mauve/40' }
  if (entry.selective) return { label: 'SEL', color: 'bg-ctp-teal/50 text-ctp-teal ring-1 ring-ctp-teal/40' }
  if (entry.sticky > 0) return { label: 'STICKY', color: 'bg-ctp-blue/50 text-ctp-blue ring-1 ring-ctp-blue/40' }
  return { label: 'KW', color: 'bg-ctp-blue/50 text-ctp-blue ring-1 ring-ctp-blue/40' }
}

export function EntryListItem({ entry, isSelected, onSelect, onToggleEnabled, displayMetric, severity }: EntryListItemProps) {
  const badge = getTypeBadge(entry)

  return (
    <div
      onClick={() => onSelect(entry.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(entry.id) }}
      tabIndex={0}
      role="option"
      aria-selected={isSelected}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left border-b border-ctp-surface0 transition-colors text-sm cursor-default',
        isSelected
          ? 'bg-ctp-accent/20 text-ctp-text border-l-2 border-l-ctp-accent'
          : 'text-ctp-subtext1 hover:bg-ctp-surface0',
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

      {/* Health dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: severityColor(severity) }}
        title={severity ?? 'No issues'}
      />

      {/* Name */}
      <span className="flex-1 truncate text-xs">{entry.name || <em className="text-ctp-overlay0">Untitled</em>}</span>

      {/* Type badge */}
      <span className={cn('text-[10px] font-mono px-1 py-0.5 rounded shrink-0', badge.color)}>
        {badge.label}
      </span>

      {/* Metric */}
      <span className="text-[10px] text-ctp-overlay1 shrink-0">
        {displayMetric === 'tokens' ? `${entry.tokenCount}t` : `${entry.order}`}
      </span>
    </div>
  )
}
