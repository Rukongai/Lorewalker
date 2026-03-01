import { getBezierPath, getStraightPath, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { Edge, EdgeProps } from '@xyflow/react'

export interface RecursionEdgeData {
  blocked: boolean
  isCyclic: boolean
  isHighlighted?: boolean
  isIncoming?: boolean
  isActivated?: boolean
  edgeStyle?: 'bezier' | 'straight' | 'smoothstep'
  [key: string]: unknown
}

export type RecursionEdgeType = Edge<RecursionEdgeData>

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
}: EdgeProps<RecursionEdgeType>) {
  const blocked = data?.blocked ?? false
  const isCyclic = data?.isCyclic ?? false
  const isIncoming = data?.isIncoming ?? false
  const isActivated = data?.isActivated ?? false

  const color = isActivated
    ? 'var(--color-ctp-yellow)'
    : isCyclic
    ? 'var(--edge-cycle)'
    : blocked
    ? 'var(--edge-blocked)'
    : isIncoming
    ? 'var(--edge-incoming)'
    : 'var(--edge-active)'

  const strokeWidth = isActivated ? 2.5 : 1.5

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
        style={{ stroke: color, strokeWidth, strokeDasharray: blocked ? '5 3' : undefined }}
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
      <EdgeLabelRenderer><></></EdgeLabelRenderer>
    </>
  )
}
