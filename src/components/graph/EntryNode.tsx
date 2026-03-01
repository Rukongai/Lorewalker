import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { WorkingEntry } from '@/types'

export interface EntryNodeData {
  entry: WorkingEntry
  isCyclic: boolean
  edgeDirection: 'LR' | 'TB'
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

export function EntryNode({ data, selected }: NodeProps<EntryNodeData>) {
  const { entry, isCyclic, edgeDirection } = data
  const activationType = getActivationType(entry)
  const accentColor = ACTIVATION_COLORS[activationType]
  const isLR = edgeDirection !== 'TB'

  const outlineColor = selected
    ? accentColor
    : isCyclic
    ? 'var(--edge-cycle)'
    : 'transparent'

  return (
    <div
      style={{
        borderLeft: `3px solid ${accentColor}`,
        outline: `2px solid ${outlineColor}`,
        outlineOffset: '2px',
      }}
      className="bg-ctp-mantle border border-ctp-surface2 rounded px-3 py-2 w-[180px] min-h-[60px] flex flex-col gap-1 cursor-pointer shadow-lg"
    >
      <Handle type="target" position={isLR ? Position.Left : Position.Top} className="!bg-ctp-overlay0 !border-ctp-overlay0" />

      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-ctp-text truncate flex-1" title={entry.name}>
          {entry.name || '(unnamed)'}
        </span>
        <span
          className="text-[10px] font-bold px-1 rounded shrink-0"
          style={{ color: accentColor, border: `1px solid ${accentColor}` }}
        >
          {ACTIVATION_BADGE[activationType]}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ctp-overlay1">{entry.tokenCount}t</span>
        {/* Health dot placeholder — Phase 3 fills this with real severity */}
        <span className="w-2 h-2 rounded-full bg-ctp-overlay0" title="Health (Phase 3)" />
      </div>

      <Handle type="source" position={isLR ? Position.Right : Position.Bottom} className="!bg-ctp-overlay0 !border-ctp-overlay0" />
    </div>
  )
}
