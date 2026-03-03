import type {
  WorkingEntry,
  RecursionGraph,
  EdgeMeta,
  CycleResult,
  DeadLink,
  KeywordMatchOptions,
  GraphLayoutSettings,
} from '@/types'
import { doesEntryMatchText } from '@/services/simulator/keyword-matching'
import dagre from 'dagre'

const DEFAULT_OPTIONS: KeywordMatchOptions = {
  caseSensitive: false,
  matchWholeWords: false,
}

export function buildGraph(
  entries: WorkingEntry[],
  options: KeywordMatchOptions = DEFAULT_OPTIONS,
): RecursionGraph {
  const edges = new Map<string, Set<string>>()
  const reverseEdges = new Map<string, Set<string>>()
  const edgeMeta = new Map<string, EdgeMeta>()

  for (const entry of entries) {
    edges.set(entry.id, new Set())
    reverseEdges.set(entry.id, new Set())
  }

  for (const source of entries) {
    if (!source.content) continue

    for (const target of entries) {
      if (source.id === target.id) continue
      if (target.keys.length === 0) continue

      const edgeOptions: KeywordMatchOptions = {
        caseSensitive: target.caseSensitive ?? options.caseSensitive,
        matchWholeWords: target.matchWholeWords ?? options.matchWholeWords,
      }
      const matches = doesEntryMatchText(target, source.content, edgeOptions)
      if (matches.length === 0) continue

      edges.get(source.id)!.add(target.id)
      reverseEdges.get(target.id)!.add(source.id)

      const edgeKey = `${source.id}\u2192${target.id}`
      edgeMeta.set(edgeKey, {
        sourceId: source.id,
        targetId: target.id,
        matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
        blockedByPreventRecursion: source.preventRecursion,
        blockedByExcludeRecursion: target.excludeRecursion,
      })
    }
  }

  return { edges, reverseEdges, edgeMeta }
}

export function findCycles(graph: RecursionGraph): CycleResult {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const onStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): void {
    visited.add(nodeId)
    onStack.add(nodeId)
    path.push(nodeId)

    for (const neighbor of graph.edges.get(nodeId) ?? new Set()) {
      // Skip blocked edges — they cannot propagate recursion, so can't form real cycles
      const edgeKey = `${nodeId}\u2192${neighbor}`
      const meta = graph.edgeMeta.get(edgeKey)
      if (meta?.blockedByPreventRecursion || meta?.blockedByExcludeRecursion) continue

      if (!visited.has(neighbor)) {
        dfs(neighbor)
      } else if (onStack.has(neighbor)) {
        const cycleStart = path.lastIndexOf(neighbor)
        cycles.push([...path.slice(cycleStart), neighbor])
      }
    }

    path.pop()
    onStack.delete(nodeId)
  }

  for (const nodeId of graph.edges.keys()) {
    if (!visited.has(nodeId)) dfs(nodeId)
  }

  return { cycles }
}

export function findOrphans(entries: WorkingEntry[], graph: RecursionGraph): string[] {
  return entries
    .filter((e) => !e.constant && (graph.reverseEdges.get(e.id)?.size ?? 0) === 0)
    .map((e) => e.id)
}

export function findDeadLinks(entries: WorkingEntry[], graph: RecursionGraph): DeadLink[] {
  const deadLinks: DeadLink[] = []

  for (const source of entries) {
    if (!source.content) continue

    for (const target of entries) {
      if (source.id === target.id) continue
      if (!target.name) continue

      // Skip if an edge already exists (keywords matched correctly)
      if (graph.edges.get(source.id)?.has(target.id)) continue

      // Check if target's display name appears in source's content (case-insensitive)
      const lowerContent = source.content.toLowerCase()
      const lowerName = target.name.toLowerCase()
      const idx = lowerContent.indexOf(lowerName)
      if (idx === -1) continue

      // Require word boundaries to avoid false positives (e.g., "Al" matching "also")
      const before = idx > 0 ? lowerContent[idx - 1] : ''
      const after = idx + lowerName.length < lowerContent.length ? lowerContent[idx + lowerName.length] : ''
      if ((before && /\w/.test(before)) || (after && /\w/.test(after))) continue

      const snippetStart = Math.max(0, idx - 20)
      const snippetEnd = Math.min(source.content.length, idx + target.name.length + 20)

      deadLinks.push({
        sourceEntryId: source.id,
        mentionedName: target.name,
        contextSnippet: source.content.slice(snippetStart, snippetEnd),
      })
    }
  }

  return deadLinks
}

export function incrementalUpdate(
  graph: RecursionGraph,
  changedEntry: WorkingEntry,
  allEntries: WorkingEntry[],
  options: KeywordMatchOptions,
  changeType: 'content' | 'keys',
): RecursionGraph {
  // Shallow-clone the graph (new Maps with new Sets — don't mutate original)
  const edges = new Map<string, Set<string>>()
  const reverseEdges = new Map<string, Set<string>>()
  const edgeMeta = new Map<string, EdgeMeta>(graph.edgeMeta)

  for (const [id, set] of graph.edges) edges.set(id, new Set(set))
  for (const [id, set] of graph.reverseEdges) reverseEdges.set(id, new Set(set))

  if (changeType === 'content') {
    // Remove all outgoing edges from changedEntry
    const oldOutgoing = new Set(edges.get(changedEntry.id) ?? [])
    for (const targetId of oldOutgoing) {
      reverseEdges.get(targetId)?.delete(changedEntry.id)
      edgeMeta.delete(`${changedEntry.id}\u2192${targetId}`)
    }
    edges.set(changedEntry.id, new Set())

    // Recompute outgoing edges using the new content
    if (changedEntry.content) {
      for (const target of allEntries) {
        if (target.id === changedEntry.id || target.keys.length === 0) continue
        const edgeOptions: KeywordMatchOptions = {
          caseSensitive: target.caseSensitive ?? options.caseSensitive,
          matchWholeWords: target.matchWholeWords ?? options.matchWholeWords,
        }
        const matches = doesEntryMatchText(target, changedEntry.content, edgeOptions)
        if (!matches.length) continue
        edges.get(changedEntry.id)!.add(target.id)
        if (!reverseEdges.has(target.id)) reverseEdges.set(target.id, new Set())
        reverseEdges.get(target.id)!.add(changedEntry.id)
        edgeMeta.set(`${changedEntry.id}\u2192${target.id}`, {
          sourceId: changedEntry.id,
          targetId: target.id,
          matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
          blockedByPreventRecursion: changedEntry.preventRecursion,
          blockedByExcludeRecursion: target.excludeRecursion,
        })
      }
    }
  } else {
    // changeType === 'keys': remove all incoming edges to changedEntry
    const oldIncoming = new Set(reverseEdges.get(changedEntry.id) ?? [])
    for (const sourceId of oldIncoming) {
      edges.get(sourceId)?.delete(changedEntry.id)
      edgeMeta.delete(`${sourceId}\u2192${changedEntry.id}`)
    }
    reverseEdges.set(changedEntry.id, new Set())

    // Recompute incoming edges: scan all other entries' content against new keys
    const targetEdgeOptions: KeywordMatchOptions = {
      caseSensitive: changedEntry.caseSensitive ?? options.caseSensitive,
      matchWholeWords: changedEntry.matchWholeWords ?? options.matchWholeWords,
    }
    for (const source of allEntries) {
      if (source.id === changedEntry.id || !source.content || changedEntry.keys.length === 0) continue
      const matches = doesEntryMatchText(changedEntry, source.content, targetEdgeOptions)
      if (!matches.length) continue
      if (!edges.has(source.id)) edges.set(source.id, new Set())
      edges.get(source.id)!.add(changedEntry.id)
      reverseEdges.get(changedEntry.id)!.add(source.id)
      edgeMeta.set(`${source.id}\u2192${changedEntry.id}`, {
        sourceId: source.id,
        targetId: changedEntry.id,
        matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
        blockedByPreventRecursion: source.preventRecursion,
        blockedByExcludeRecursion: changedEntry.excludeRecursion,
      })
    }
  }

  return { edges, reverseEdges, edgeMeta }
}

export function findIslands(entries: WorkingEntry[], graph: RecursionGraph): string[] {
  return entries
    .filter((e) => !e.constant)
    .filter((e) => (graph.edges.get(e.id)?.size ?? 0) === 0 && (graph.reverseEdges.get(e.id)?.size ?? 0) === 0)
    .map((e) => e.id)
}

export function computeChainDepths(graph: RecursionGraph, entries: WorkingEntry[]): Map<string, number> {
  const depths = new Map<string, number>()

  function dfs(id: string, stack: Set<string>): number {
    if (stack.has(id)) return 0 // cycle — stop
    if (depths.has(id)) return depths.get(id)!
    stack.add(id)
    const children = graph.edges.get(id) ?? new Set()
    let max = 0
    for (const child of children) {
      const edgeKey = `${id}\u2192${child}`
      const meta = graph.edgeMeta.get(edgeKey)
      if (meta?.blockedByPreventRecursion || meta?.blockedByExcludeRecursion) continue
      max = Math.max(max, 1 + dfs(child, stack))
    }
    stack.delete(id)
    depths.set(id, max)
    return max
  }

  for (const entry of entries) {
    if (!depths.has(entry.id)) {
      dfs(entry.id, new Set())
    }
  }

  return depths
}

export function findLongestChain(graph: RecursionGraph, startId: string): string[] {
  // Phase 1: memoized DFS to compute depth of each reachable node (O(V+E))
  const depths = new Map<string, number>()
  const onStack = new Set<string>()

  function dfsDepth(id: string): number {
    if (onStack.has(id)) return 0 // cycle — stop
    if (depths.has(id)) return depths.get(id)!
    onStack.add(id)
    const children = graph.edges.get(id) ?? new Set()
    let max = 0
    for (const child of children) {
      const edgeKey = `${id}\u2192${child}`
      const meta = graph.edgeMeta.get(edgeKey)
      if (meta?.blockedByPreventRecursion || meta?.blockedByExcludeRecursion) continue
      max = Math.max(max, 1 + dfsDepth(child))
    }
    onStack.delete(id)
    depths.set(id, max)
    return max
  }

  dfsDepth(startId)

  // Phase 2: greedy path reconstruction following highest-depth child
  const path: string[] = []
  const visited = new Set<string>()
  let current: string | undefined = startId

  while (current !== undefined && !visited.has(current)) {
    path.push(current)
    visited.add(current)
    const children = graph.edges.get(current) ?? new Set()
    let bestChild: string | undefined
    let bestDepth = -1
    for (const child of children) {
      const edgeKey = `${current}\u2192${child}`
      const meta = graph.edgeMeta.get(edgeKey)
      if (meta?.blockedByPreventRecursion || meta?.blockedByExcludeRecursion) continue
      if (visited.has(child)) continue
      const d = depths.get(child) ?? 0
      if (d > bestDepth) {
        bestDepth = d
        bestChild = child
      }
    }
    current = bestChild
  }

  return path
}

export function getReachableEntries(
  entryId: string,
  graph: RecursionGraph,
  maxDepth?: number,
): Set<string> {
  const visited = new Set<string>()
  const queue: [string, number][] = [[entryId, 0]]
  while (queue.length > 0) {
    const [current, depth] = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    if (maxDepth && depth >= maxDepth) continue
    const neighbors = graph.edges.get(current)
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const edgeKey = `${current}\u2192${neighbor}`
          const meta = graph.edgeMeta.get(edgeKey)
          if (meta?.blockedByPreventRecursion || meta?.blockedByExcludeRecursion) continue
          queue.push([neighbor, depth + 1])
        }
      }
    }
  }
  visited.delete(entryId)
  return visited
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 60

export function computeLayout(
  entries: WorkingEntry[],
  graph: RecursionGraph,
  existingPositions?: Map<string, { x: number; y: number }>,
  settings?: GraphLayoutSettings,
): Map<string, { x: number; y: number }> {
  // If all entries already have positions, return them unchanged
  if (existingPositions && entries.every((e) => existingPositions.has(e.id))) {
    const entryIds = new Set(entries.map((e) => e.id))
    const filtered = new Map<string, { x: number; y: number }>()
    for (const [id, pos] of existingPositions) {
      if (entryIds.has(id)) filtered.set(id, pos)
    }
    return filtered
  }

  const g = new dagre.graphlib.Graph()
  g.setGraph({
    acyclicer: settings?.acyclicer === 'none' ? undefined : (settings?.acyclicer ?? 'greedy'),
    ranker: settings?.ranker ?? 'network-simplex',
    align: settings?.align ?? 'UR',
    rankdir: settings?.rankdir ?? 'LR',
    nodesep: 30, ranksep: 60, marginx: 20, marginy: 20,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const entry of entries) {
    g.setNode(entry.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const [sourceId, targets] of graph.edges) {
    if (!g.hasNode(sourceId)) continue
    for (const targetId of targets) {
      if (!g.hasNode(targetId)) continue
      const edgeKey = `${sourceId}\u2192${targetId}`
      const meta = graph.edgeMeta.get(edgeKey)
      if (meta?.blockedByPreventRecursion || meta?.blockedByExcludeRecursion) continue
      g.setEdge(sourceId, targetId)
    }
  }

  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const entry of entries) {
    const node = g.node(entry.id)
    // dagre centers nodes; React Flow uses top-left corner
    positions.set(entry.id, {
      x: node ? node.x - NODE_WIDTH / 2 : 0,
      y: node ? node.y - NODE_HEIGHT / 2 : 0,
    })
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
