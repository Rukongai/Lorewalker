import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { WorkingEntry, FindingSeverity } from '@/types'
import { severityColor } from '@/lib/severity-color'
import { getEntryIcon } from '@/lib/entry-type'
import { useCategoryMenu } from '@/components/entry-list/CategoryMenu'

export type EntryNodeType = Node<EntryNodeData>

export interface EntryNodeData {
  entry: WorkingEntry
  isCyclic: boolean
  edgeDirection: 'LR' | 'TB'
  severity: FindingSeverity | null
  activationStatus?: 'activated-constant' | 'activated-keyword' | 'activated-recursion' | 'skipped' | null
  isDimmed?: boolean
  onSetCategory?: (entryId: string, category: string | undefined) => void
  [key: string]: unknown
}

type ActivationType = 'constant' | 'keyword' | 'selective' | 'disabled'

function getActivationType(entry: WorkingEntry): ActivationType {
  if (!entry.enabled) return 'disabled'
  if (entry.constant) return 'constant'
  if (entry.selective) return 'selective'
  return 'keyword'
}

const ACTIVATION_COLORS: Record<ActivationType, string> = {
  constant: 'var(--node-constant)',
  keyword: 'var(--node-keyword)',
  selective: 'var(--node-selective)',
  disabled: 'var(--node-disabled)',
}

const ACTIVATION_BADGE: Record<ActivationType, string> = {
  constant: 'C',
  keyword: 'K',
  selective: 'S',
  disabled: 'D',
}

export function EntryNode({ data, selected }: NodeProps<EntryNodeType>) {
  const { entry, isCyclic, edgeDirection, severity, activationStatus, isDimmed, onSetCategory } = data
  const activationType = getActivationType(entry)
  const accentColor = ACTIVATION_COLORS[activationType]
  const isLR = edgeDirection !== 'TB'
  const effectiveCategory = entry.userCategory ?? 'generic'
  const categoryIcon = getEntryIcon(effectiveCategory)

  const { openMenu, menuElement } = useCategoryMenu((category) => {
    onSetCategory?.(entry.id, category)
  })

  // Determine outline based on activation status or selection/cycle
  let outlineColor = 'transparent'
  let outlineStyle: string | undefined
  if (activationStatus === 'activated-constant') {
    outlineColor = 'var(--node-constant)'
  } else if (activationStatus === 'activated-keyword' && entry.selective) {
    outlineColor = 'var(--color-ctp-yellow)'
  } else if (activationStatus === 'activated-keyword') {
    outlineColor = 'var(--color-ctp-green)'
  } else if (activationStatus === 'activated-recursion') {
    outlineColor = 'var(--color-ctp-mauve)'
  } else if (activationStatus === 'skipped') {
    outlineColor = 'var(--color-ctp-peach)'
    outlineStyle = 'dashed'
  } else if (selected) {
    outlineColor = accentColor
  } else if (isCyclic) {
    outlineColor = 'var(--edge-cycle)'
  }

  return (
    <>
    <div
      onContextMenu={(e) => onSetCategory ? openMenu(e, entry.userCategory) : undefined}
      style={{
        borderLeft: `3px solid ${accentColor}`,
        outline: `2px ${outlineStyle ?? 'solid'} ${outlineColor}`,
        outlineOffset: '2px',
        opacity: isDimmed ? 0.3 : 1,
      }}
      className="bg-ctp-mantle border border-ctp-surface2 rounded px-3 py-2 w-[180px] min-h-[60px] flex flex-col gap-1 cursor-pointer shadow-lg transition-opacity"
    >
      <Handle type="target" position={isLR ? Position.Left : Position.Top} className="!bg-ctp-overlay0 !border-ctp-overlay0" />

      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-ctp-text truncate flex-1" title={entry.name}>
          {entry.name || '(unnamed)'}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {categoryIcon && (
            <span className="text-[10px]" title={effectiveCategory}>
              {categoryIcon}
            </span>
          )}
          <span
            className="text-[10px] font-bold px-1 rounded"
            style={{ color: accentColor, border: `1px solid ${accentColor}`, background: `color-mix(in srgb, ${accentColor} 20%, transparent)` }}
          >
            {ACTIVATION_BADGE[activationType]}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ctp-overlay1">{entry.tokenCount}t</span>
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: severityColor(severity) }}
          title={severity ?? 'No issues'}
        />
      </div>

      <Handle type="source" position={isLR ? Position.Right : Position.Bottom} className="!bg-ctp-overlay0 !border-ctp-overlay0" />
    </div>
    {menuElement}
    </>
  )
}
