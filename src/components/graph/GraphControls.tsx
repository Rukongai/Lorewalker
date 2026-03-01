import { useReactFlow } from '@xyflow/react'
import { LayoutGrid, Maximize2, Eye, EyeOff, Network, Crosshair, Minus, Spline, CornerDownRight } from 'lucide-react'

export type ConnectionVisibility = 'all' | 'selected' | 'none'

interface GraphControlsProps {
  onAutoLayout: () => void
  showBlockedEdges: boolean
  onToggleBlockedEdges: () => void
  connectionVisibility: ConnectionVisibility
  onCycleConnectionVisibility: () => void
  edgeStyle: 'bezier' | 'straight' | 'smoothstep'
  onToggleEdgeStyle: () => void
}

const visibilityIcon = {
  all: Network,
  selected: Crosshair,
  none: EyeOff,
}

const visibilityTitle = {
  all: 'Show all connections (click to show selected only)',
  selected: 'Show connections for selected node (click to hide all)',
  none: 'Connections hidden (click to show all)',
}

export function GraphControls({
  onAutoLayout,
  showBlockedEdges,
  onToggleBlockedEdges,
  connectionVisibility,
  onCycleConnectionVisibility,
  edgeStyle,
  onToggleEdgeStyle,
}: GraphControlsProps) {
  const { fitView } = useReactFlow()
  const VisibilityIcon = visibilityIcon[connectionVisibility]

  return (
    <div className="absolute top-3 right-3 z-10 flex gap-1">
      <button
        onClick={onAutoLayout}
        title="Auto Layout"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-ctp-surface0 border border-ctp-accent/50 rounded text-ctp-accent hover:bg-ctp-accent/15 hover:border-ctp-accent transition-colors"
      >
        <LayoutGrid size={13} />
        Layout
      </button>

      <button
        onClick={() => fitView({ padding: 0.15, duration: 300 })}
        title="Fit to view"
        className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
      >
        <Maximize2 size={13} />
      </button>

      <button
        onClick={onCycleConnectionVisibility}
        title={visibilityTitle[connectionVisibility]}
        className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
      >
        <VisibilityIcon size={13} />
      </button>

      <button
        onClick={onToggleBlockedEdges}
        title={showBlockedEdges ? 'Hide blocked edges' : 'Show blocked edges'}
        className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
      >
        {showBlockedEdges ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>

      <button
        onClick={onToggleEdgeStyle}
        title={edgeStyle === 'bezier' ? 'Switch to straight edges' : edgeStyle === 'straight' ? 'Switch to smoothed paths' : 'Switch to bezier/noodle edges'}
        className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
      >
        {edgeStyle === 'bezier' ? <Spline size={13} /> : edgeStyle === 'straight' ? <Minus size={13} /> : <CornerDownRight size={13} />}
      </button>
    </div>
  )
}
