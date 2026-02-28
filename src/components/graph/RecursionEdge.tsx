import { getBezierPath, getStraightPath, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export interface RecursionEdgeData {
  blocked: boolean
  isCyclic: boolean
  isHighlighted?: boolean
  isIncoming?: boolean
  edgeStyle?: 'bezier' | 'straight' | 'smoothstep'
  [key: string]: unknown
}

export function RecursionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<RecursionEdgeData>) {
  const blocked = data?.blocked ?? false
  const isCyclic = data?.isCyclic ?? false
  const isIncoming = data?.isIncoming ?? false

  const color = isCyclic
    ? 'var(--edge-cycle)'
    : blocked
    ? 'var(--edge-blocked)'
    : isIncoming
    ? 'var(--edge-incoming)'
    : 'var(--edge-active)'

  const [edgePath] =
    data?.edgeStyle === 'straight'
      ? getStraightPath({ sourceX, sourceY, targetX, targetY })
      : data?.edgeStyle === 'smoothstep'
      ? getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
      : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        style={{ stroke: color, strokeWidth: 1.5, strokeDasharray: blocked ? '5 3' : undefined }}
        markerEnd={markerEnd}
        className="react-flow__edge-path"
      />
      {/* Wider transparent path for easier interaction */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={10}
        className="react-flow__edge-interaction"
      />
      <EdgeLabelRenderer>{/* keyword label placeholder for Phase 3 */}</EdgeLabelRenderer>
    </>
  )
}
