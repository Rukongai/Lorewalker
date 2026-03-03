import { useReactFlow } from '@xyflow/react'
import { LayoutGrid, Maximize2, Eye, EyeOff, Network, Crosshair, Minus, Spline, CornerDownRight, Search, X, HelpCircle, Loader2, Layers, Filter, Group, ScanLine } from 'lucide-react'
import { GraphLegend } from './GraphLegend'
import { Tooltip } from '@/components/ui/Tooltip'

export type ConnectionVisibility = 'all' | 'selected' | 'none'

interface GraphControlsProps {
  onAutoLayout: () => void
  isLayouting?: boolean
  showBlockedEdges: boolean
  onToggleBlockedEdges: () => void
  connectionVisibility: ConnectionVisibility
  onCycleConnectionVisibility: () => void
  edgeStyle: 'bezier' | 'straight' | 'smoothstep'
  onToggleEdgeStyle: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  legendOpen: boolean
  onToggleLegend: () => void
  connectionsMode: boolean
  layoutMode: 'default' | 'skeleton' | 'clustered'
  onCycleLayoutMode: () => void
  dimEdges: boolean
  onToggleDimEdges: () => void
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

const layoutModeIcon = {
  default: Layers,
  skeleton: Filter,
  clustered: Group,
}

const layoutModeNextLabel = {
  default: 'Default layout (click to switch to Skeleton mode)',
  skeleton: 'Skeleton layout – top edges only (click to switch to Clustered mode)',
  clustered: 'Clustered layout – grouped by keywords (click to switch to Default mode)',
}

export function GraphControls({
  onAutoLayout,
  isLayouting = false,
  showBlockedEdges,
  onToggleBlockedEdges,
  connectionVisibility,
  onCycleConnectionVisibility,
  edgeStyle,
  onToggleEdgeStyle,
  searchQuery,
  onSearchChange,
  legendOpen,
  onToggleLegend,
  connectionsMode,
  layoutMode,
  onCycleLayoutMode,
  dimEdges,
  onToggleDimEdges,
}: GraphControlsProps) {
  const { fitView } = useReactFlow()
  const VisibilityIcon = visibilityIcon[connectionVisibility]
  const LayoutModeIcon = layoutModeIcon[layoutMode]

  return (
    <div className="absolute top-3 right-3 z-10 flex gap-1 items-center">
      {/* Search input */}
      <div className="flex items-center gap-1 px-2 py-1 bg-ctp-surface0 border border-ctp-surface1 rounded text-xs">
        <Search size={11} className="text-ctp-overlay1 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter nodes…"
          className="w-24 bg-transparent text-ctp-subtext1 placeholder-ctp-overlay0 outline-none text-[11px]"
          autoComplete="off"
          data-1p-ignore
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className="text-ctp-overlay1 hover:text-ctp-subtext1">
            <X size={10} />
          </button>
        )}
      </div>

      <Tooltip text="Auto Layout">
        <button
          onClick={onAutoLayout}
          disabled={isLayouting}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-ctp-surface0 border border-ctp-accent/50 rounded text-ctp-accent hover:bg-ctp-accent/15 hover:border-ctp-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLayouting ? <Loader2 size={13} className="animate-spin" /> : <LayoutGrid size={13} />}
          Layout
        </button>
      </Tooltip>

      <Tooltip text={layoutModeNextLabel[layoutMode]}>
        <button
          onClick={onCycleLayoutMode}
          className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
        >
          <LayoutModeIcon size={13} />
        </button>
      </Tooltip>

      <Tooltip text={dimEdges ? 'Edge dimming on (click to disable)' : 'Dim unrelated edges when node selected'}>
        <button
          onClick={onToggleDimEdges}
          className={`p-1.5 bg-ctp-surface0 border rounded transition-colors ${dimEdges ? 'border-ctp-accent text-ctp-accent hover:bg-ctp-accent/15' : 'border-ctp-surface1 text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text'}`}
        >
          <ScanLine size={13} />
        </button>
      </Tooltip>

      <Tooltip text="Fit to view">
        <button
          onClick={() => fitView({ padding: 0.15, duration: 300 })}
          className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
        >
          <Maximize2 size={13} />
        </button>
      </Tooltip>

      <Tooltip text={visibilityTitle[connectionVisibility]}>
        <button
          onClick={onCycleConnectionVisibility}
          className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
        >
          <VisibilityIcon size={13} />
        </button>
      </Tooltip>

      <Tooltip text={showBlockedEdges ? 'Hide blocked edges' : 'Show blocked edges'}>
        <button
          onClick={onToggleBlockedEdges}
          className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
        >
          {showBlockedEdges ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </Tooltip>

      <Tooltip text={edgeStyle === 'bezier' ? 'Switch to straight edges' : edgeStyle === 'straight' ? 'Switch to smoothed paths' : 'Switch to bezier/noodle edges'}>
        <button
          onClick={onToggleEdgeStyle}
          className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
        >
          {edgeStyle === 'bezier' ? <Spline size={13} /> : edgeStyle === 'straight' ? <Minus size={13} /> : <CornerDownRight size={13} />}
        </button>
      </Tooltip>

      <div className="relative flex items-center">
        <Tooltip text={legendOpen ? 'Close legend' : 'Show graph legend'}>
          <button
            onClick={onToggleLegend}
            className="p-1.5 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
          >
            <HelpCircle size={13} />
          </button>
        </Tooltip>
        {legendOpen && (
          <div className="absolute top-full right-0 mt-1 z-50">
            <GraphLegend isOpen={legendOpen} onToggle={onToggleLegend} connectionsMode={connectionsMode} />
          </div>
        )}
      </div>
    </div>
  )
}
