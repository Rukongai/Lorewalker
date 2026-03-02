import { X } from 'lucide-react'

interface GraphLegendProps {
  isOpen: boolean
  onToggle: () => void
  connectionsMode: boolean
}

interface SwatchRowProps {
  color: string
  label: string
  dashed?: boolean
  isEdge?: boolean
}

function SwatchRow({ color, label, dashed, isEdge }: SwatchRowProps) {
  if (isEdge) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center shrink-0 w-8">
          <div
            style={{
              width: '28px',
              height: '2px',
              background: color,
              borderTop: dashed ? `2px dashed ${color}` : undefined,
              backgroundImage: dashed ? 'none' : undefined,
            }}
          />
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderLeft: `5px solid ${color}`,
              marginLeft: '-1px',
            }}
          />
        </div>
        <span className="text-[10px] text-ctp-subtext1">{label}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-sm shrink-0"
        style={{
          background: color,
          outline: dashed ? `2px dashed ${color}` : undefined,
          outlineOffset: dashed ? '2px' : undefined,
        }}
      />
      <span className="text-[10px] text-ctp-subtext1">{label}</span>
    </div>
  )
}

interface BadgeRowProps {
  badge: string
  color: string
  label: string
  description: string
}

function BadgeRow({ badge, color, label, description }: BadgeRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[10px] font-bold px-1 rounded shrink-0"
        style={{
          color,
          border: `1px solid ${color}`,
          background: `color-mix(in srgb, ${color} 20%, transparent)`,
          minWidth: '18px',
          textAlign: 'center',
        }}
      >
        {badge}
      </span>
      <span className="text-[10px] text-ctp-subtext0 font-medium">{label}</span>
      <span className="text-[10px] text-ctp-overlay1">— {description}</span>
    </div>
  )
}

function GraphModeLegend() {
  return (
    <div className="flex flex-col gap-3">
      {/* Node types */}
      <div>
        <div className="text-[10px] font-semibold text-ctp-subtext0 uppercase tracking-wide mb-1.5">Node Types</div>
        <div className="flex flex-col gap-1">
          <BadgeRow badge="C" color="var(--node-constant)" label="Constant" description="Always injected" />
          <BadgeRow badge="K" color="var(--node-keyword)" label="Keyword" description="Triggered by keyword" />
          <BadgeRow badge="S" color="var(--node-selective)" label="Selective" description="Keyword + secondary keys" />
          <BadgeRow badge="D" color="var(--node-disabled)" label="Disabled" description="Inactive" />
        </div>
      </div>

      {/* Node outlines */}
      <div>
        <div className="text-[10px] font-semibold text-ctp-subtext0 uppercase tracking-wide mb-1.5">Node Outlines</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ outline: '2px solid var(--node-keyword)', outlineOffset: '2px', background: 'transparent' }}
            />
            <span className="text-[10px] text-ctp-subtext1">Selected (accent color)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ outline: '2px solid var(--edge-cycle)', outlineOffset: '2px', background: 'transparent' }}
            />
            <span className="text-[10px] text-ctp-subtext1">Circular reference (cycle)</span>
          </div>
        </div>
      </div>

      {/* Edges */}
      <div>
        <div className="text-[10px] font-semibold text-ctp-subtext0 uppercase tracking-wide mb-1.5">Edges</div>
        <div className="flex flex-col gap-1">
          <SwatchRow color="var(--edge-active)" label="Active recursion link" isEdge />
          <SwatchRow color="var(--edge-blocked)" label="Blocked (preventRecursion)" isEdge dashed />
          <SwatchRow color="var(--edge-cycle)" label="Circular reference" isEdge />
          <SwatchRow color="var(--edge-incoming)" label="Incoming to selected node" isEdge />
          <SwatchRow color="var(--color-ctp-yellow)" label="Activated in last simulation" isEdge />
        </div>
      </div>
    </div>
  )
}

function SimulatorLegend() {
  return (
    <div className="flex flex-col gap-3">
      {/* Node outlines */}
      <div>
        <div className="text-[10px] font-semibold text-ctp-subtext0 uppercase tracking-wide mb-1.5">Node Outlines</div>
        <div className="flex flex-col gap-1">
          <SwatchRow color="var(--node-constant)" label="Activated as constant" />
          <SwatchRow color="var(--color-ctp-green)" label="Activated by keyword" />
          <SwatchRow color="var(--color-ctp-yellow)" label="Activated by keyword (selective)" />
          <SwatchRow color="var(--color-ctp-mauve)" label="Activated by recursion" />
          <SwatchRow color="var(--color-ctp-peach)" label="Skipped (budget/probability)" dashed />
        </div>
      </div>

      {/* Edges — depth-colored */}
      <div>
        <div className="text-[10px] font-semibold text-ctp-subtext0 uppercase tracking-wide mb-1.5">Edges (by depth)</div>
        <div className="flex flex-col gap-1">
          <SwatchRow color="var(--color-ctp-green)" label="Depth 0 — direct activation" isEdge />
          <SwatchRow color="var(--color-ctp-yellow)" label="Depth 1 — 1st recursion pass" isEdge />
          <SwatchRow color="var(--color-ctp-peach)" label="Depth 2 — 2nd recursion pass" isEdge />
          <SwatchRow color="var(--color-ctp-red)" label="Depth 3+ — deep recursion" isEdge />
          <SwatchRow color="var(--color-ctp-red)" label="→ Skipped target entry" isEdge dashed />
        </div>
      </div>
    </div>
  )
}

export function GraphLegend({ isOpen, onToggle, connectionsMode }: GraphLegendProps) {
  if (!isOpen) return null
  return (
    <div className="w-64 bg-ctp-surface0 border border-ctp-surface1 rounded shadow-lg p-3 text-ctp-text">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold text-ctp-subtext0 uppercase tracking-wide">
          {connectionsMode ? 'Simulator Mode' : 'Graph Legend'}
        </span>
        <button
          onClick={onToggle}
          className="text-ctp-overlay1 hover:text-ctp-subtext1 transition-colors"
          title="Close legend"
        >
          <X size={12} />
        </button>
      </div>
      {connectionsMode ? <SimulatorLegend /> : <GraphModeLegend />}
    </div>
  )
}
