import { cn } from '@/lib/cn'
import type { WorkingEntry, FindingSeverity } from '@/types'
import { Toggle } from '@/components/shared/Toggle'
import { severityColor } from '@/lib/severity-color'
import { useCategoryMenu } from './CategoryMenu'
import { getTypeBadge } from '@/lib/entry-badge'

interface EntryListItemProps {
  entry: WorkingEntry
  isSelected: boolean
  isMultiSelected: boolean
  onSelect: (id: string) => void
  onMultiToggle: (id: string) => void
  onShiftSelect: (id: string) => void
  onToggleEnabled: (id: string) => void
  onSetCategory?: (entryId: string, category: string | undefined) => void
  onOpenModal?: () => void
  displayMetric: 'tokens' | 'order'
  severity: FindingSeverity | null
}

export function EntryListItem({
  entry,
  isSelected,
  isMultiSelected,
  onSelect,
  onMultiToggle,
  onShiftSelect,
  onToggleEnabled,
  onSetCategory,
  onOpenModal,
  displayMetric,
  severity,
}: EntryListItemProps) {
  const badge = getTypeBadge(entry)

  const { openMenu, menuElement } = useCategoryMenu((category) => {
    onSetCategory?.(entry.id, category)
  })

  function handleClick(e: React.MouseEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      onMultiToggle(entry.id)
    } else if (e.shiftKey) {
      e.preventDefault()
      onShiftSelect(entry.id)
    } else {
      onSelect(entry.id)
    }
  }

  return (
    <>
      <div
        onClick={handleClick}
        onDoubleClick={onOpenModal}
        onContextMenu={(e) => onSetCategory ? openMenu(e, entry.userCategory) : undefined}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(entry.id) }}
        tabIndex={0}
        role="option"
        aria-selected={isSelected}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left border-b border-ctp-surface0 transition-colors text-sm cursor-default',
          isMultiSelected
            ? 'bg-ctp-blue/20 text-ctp-text border-l-2 border-l-ctp-blue'
            : isSelected
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
      {menuElement}
    </>
  )
}
