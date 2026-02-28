import { useReactFlow } from '@xyflow/react'
import { LayoutGrid, Maximize2, Eye, EyeOff } from 'lucide-react'

interface GraphControlsProps {
  onAutoLayout: () => void
  showBlockedEdges: boolean
  onToggleBlockedEdges: () => void
}

export function GraphControls({
  onAutoLayout,
  showBlockedEdges,
  onToggleBlockedEdges,
}: GraphControlsProps) {
  const { fitView } = useReactFlow()

  return (
    <div className="absolute top-3 right-3 z-10 flex gap-1">
      <button
        onClick={onAutoLayout}
        title="Auto Layout"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
      >
        <LayoutGrid size={13} />
        Layout
      </button>

      <button
        onClick={() => fitView({ padding: 0.15, duration: 300 })}
        title="Fit to view"
        className="p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
      >
        <Maximize2 size={13} />
      </button>

      <button
        onClick={onToggleBlockedEdges}
        title={showBlockedEdges ? 'Hide blocked edges' : 'Show blocked edges'}
        className="p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
      >
        {showBlockedEdges ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
    </div>
  )
}
