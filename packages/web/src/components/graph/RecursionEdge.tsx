import { getBezierPath, getStraightPath, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { Edge, EdgeProps } from '@xyflow/react'

export interface RecursionEdgeData {
  blocked: boolean
  isCyclic: boolean
  isHighlighted?: boolean
  isIncoming?: boolean
  isActivated?: boolean
  isSkippedTarget?: boolean
  edgeStyle?: 'bezier' | 'straight' | 'smoothstep'
  recursionDepth?: number
  dimmed?: boolean
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
  const isSkippedTarget = data?.isSkippedTarget ?? false
  const recursionDepth = data?.recursionDepth

  const inConnectionsMode = recursionDepth !== undefined

  const color = inConnectionsMode
    ? (recursionDepth === 0 ? 'var(--color-ctp-green)'
      : recursionDepth === 1 ? 'var(--color-ctp-yellow)'
      : recursionDepth === 2 ? 'var(--color-ctp-peach)'
      : 'var(--color-ctp-red)')
    : isSkippedTarget
    ? 'var(--color-ctp-red)'
    : isActivated
    ? 'var(--color-ctp-yellow)'
    : isCyclic
    ? 'var(--edge-cycle)'
    : blocked
    ? 'var(--edge-blocked)'
    : isIncoming
    ? 'var(--edge-incoming)'
    : 'var(--edge-active)'

  const strokeWidth = inConnectionsMode ? 3 : (isActivated || isSkippedTarget) ? 2.5 : 1.5

  const [edgePath] =
    data?.edgeStyle === 'straight'
      ? getStraightPath({ sourceX, sourceY, targetX, targetY })
      : data?.edgeStyle === 'smoothstep'
      ? getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
      : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  const dimmed = data?.dimmed ?? false

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        style={{ stroke: color, strokeWidth, strokeDasharray: (blocked || isSkippedTarget) ? '5 3' : undefined, opacity: dimmed ? 0.08 : 1 }}
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
