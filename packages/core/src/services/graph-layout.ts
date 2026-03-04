// Web-only: this file imports elkjs and must never be imported from mobile code paths.
// Use graph-service.ts for all graph query/analysis functions.
import type { WorkingEntry, RecursionGraph } from '../types'
import ELK from 'elkjs/lib/elk.bundled.js'
import { buildLayoutSkeleton, detectKeywordCommunities } from './graph-service'

const NODE_WIDTH = 180
const NODE_HEIGHT = 60

const elk = new ELK()

export async function computeLayout(
  entries: WorkingEntry[],
  graph: RecursionGraph,
  existingPositions?: Map<string, { x: number; y: number }>,
  layoutMode?: 'default' | 'skeleton' | 'clustered',
): Promise<Map<string, { x: number; y: number }>> {
  // If all entries already have positions, return them unchanged
  if (existingPositions && entries.every((e) => existingPositions.has(e.id))) {
    const entryIds = new Set(entries.map((e) => e.id))
    const filtered = new Map<string, { x: number; y: number }>()
    for (const [id, pos] of existingPositions) {
      if (entryIds.has(id)) filtered.set(id, pos)
    }
    return filtered
  }

  // --- Clustered mode: compound ELK graph grouped by keyword communities ---
  if (layoutMode === 'clustered') {
    const clusterMap = detectKeywordCommunities(entries)
    const clusterIds = new Set(clusterMap.values())

    const elkChildren: {
      id: string
      width?: number
      height?: number
      children?: { id: string; width: number; height: number }[]
    }[] = []

    for (const clusterId of clusterIds) {
      const members = entries.filter((e) => clusterMap.get(e.id) === clusterId)
      elkChildren.push({
        id: `cluster_${clusterId}`,
        children: members.map((e) => ({ id: e.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
      })
    }

    const elkEdges: { id: string; sources: string[]; targets: string[] }[] = []
    let edgeIdx = 0
    for (const [sourceId, targets] of graph.edges) {
      for (const targetId of targets) {
        const edgeKey = `${sourceId}\u2192${targetId}`
        const meta = graph.edgeMeta.get(edgeKey)
        if (meta?.blockedByPreventRecursion || meta?.blockedByExcludeRecursion) continue
        elkEdges.push({ id: `e${edgeIdx++}`, sources: [sourceId], targets: [targetId] })
      }
    }

    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'org.eclipse.elk.layered',
        'elk.padding': '[top=30, left=30, bottom=30, right=30]',
        'elk.spacing.nodeNode': '20',
        'elk.layered.spacing.nodeNodeBetweenLayers': '40',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      },
      children: elkChildren,
      edges: elkEdges,
    }

    const laid = await elk.layout(elkGraph)

    const positions = new Map<string, { x: number; y: number }>()
    for (const cluster of laid.children ?? []) {
      const px = cluster.x ?? 0
      const py = cluster.y ?? 0
      for (const child of cluster.children ?? []) {
        positions.set(child.id, { x: px + (child.x ?? 0), y: py + (child.y ?? 0) })
      }
    }
    for (const entry of entries) {
      if (!positions.has(entry.id)) positions.set(entry.id, { x: 0, y: 0 })
    }
    return positions
  }

  // --- Skeleton mode: reduced edge set fed to ELK ---
  // --- Default mode: full edge set ---

  const elkEdgePairs: Array<{ sourceId: string; targetId: string }> =
    layoutMode === 'skeleton'
      ? buildLayoutSkeleton(graph)
      : (() => {
          const pairs: Array<{ sourceId: string; targetId: string }> = []
          for (const [sourceId, targets] of graph.edges) {
            for (const targetId of targets) {
              const edgeKey = `${sourceId}\u2192${targetId}`
              const meta = graph.edgeMeta.get(edgeKey)
              if (meta?.blockedByPreventRecursion || meta?.blockedByExcludeRecursion) continue
              pairs.push({ sourceId, targetId })
            }
          }
          return pairs
        })()

  // Count active edges to choose algorithm
  const edgeCount = elkEdgePairs.length
  const useDense = edgeCount > 300
  const algorithm = useDense ? 'org.eclipse.elk.stress' : 'org.eclipse.elk.layered'

  const elkEdges = elkEdgePairs.map((p, i) => ({
    id: `e${i}`,
    sources: [p.sourceId],
    targets: [p.targetId],
  }))

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': algorithm,
      'elk.padding': '[top=20, left=20, bottom=20, right=20]',
      ...(useDense
        ? {
            'elk.stress.desiredEdgeLength': '200',
          }
        : {
            'elk.layered.spacing.nodeNodeBetweenLayers': '60',
            'elk.spacing.nodeNode': '30',
            'elk.direction': 'RIGHT',
          }),
    },
    children: entries.map((e) => ({ id: e.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    edges: elkEdges,
  }

  const laid = await elk.layout(elkGraph)

  const positions = new Map<string, { x: number; y: number }>()
  for (const child of laid.children ?? []) {
    positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 })
  }
  // Fallback for any entries not placed by ELK
  for (const entry of entries) {
    if (!positions.has(entry.id)) positions.set(entry.id, { x: 0, y: 0 })
  }

  // Preserve any existing positions (don't overwrite manual layout)
  if (existingPositions) {
    const entryIds = new Set(entries.map((e) => e.id))
    for (const [id, pos] of existingPositions) {
      if (entryIds.has(id)) {
        positions.set(id, pos)
      }
    }
  }

  return positions
}
