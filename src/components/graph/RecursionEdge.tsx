import { getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export interface RecursionEdgeData {
  blocked: boolean
  isCyclic: boolean
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

  const color = isCyclic
    ? 'var(--edge-cycle)'
    : blocked
    ? 'var(--edge-blocked)'
    : 'var(--edge-active)'

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={blocked ? '5 3' : undefined}
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
