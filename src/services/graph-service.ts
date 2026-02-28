import type {
  WorkingEntry,
  RecursionGraph,
  EdgeMeta,
  CycleResult,
  DeadLink,
  KeywordMatchOptions,
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

      const matches = doesEntryMatchText(target, source.content, options)
      if (matches.length === 0) continue

      edges.get(source.id)!.add(target.id)
      reverseEdges.get(target.id)!.add(source.id)

      const edgeKey = `${source.id}\u2192${target.id}`
      edgeMeta.set(edgeKey, {
        sourceId: source.id,
        targetId: target.id,
        matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
        blockedByPreventRecursion: target.preventRecursion,
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
        const matches = doesEntryMatchText(target, changedEntry.content, options)
        if (!matches.length) continue
        edges.get(changedEntry.id)!.add(target.id)
        if (!reverseEdges.has(target.id)) reverseEdges.set(target.id, new Set())
        reverseEdges.get(target.id)!.add(changedEntry.id)
        edgeMeta.set(`${changedEntry.id}\u2192${target.id}`, {
          sourceId: changedEntry.id,
          targetId: target.id,
          matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
          blockedByPreventRecursion: target.preventRecursion,
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
    for (const source of allEntries) {
      if (source.id === changedEntry.id || !source.content || changedEntry.keys.length === 0) continue
      const matches = doesEntryMatchText(changedEntry, source.content, options)
      if (!matches.length) continue
      if (!edges.has(source.id)) edges.set(source.id, new Set())
      edges.get(source.id)!.add(changedEntry.id)
      reverseEdges.get(changedEntry.id)!.add(source.id)
      edgeMeta.set(`${source.id}\u2192${changedEntry.id}`, {
        sourceId: source.id,
        targetId: changedEntry.id,
        matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
        blockedByPreventRecursion: changedEntry.preventRecursion,
      })
    }
  }

  return { edges, reverseEdges, edgeMeta }
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 60

export function computeLayout(
  entries: WorkingEntry[],
  graph: RecursionGraph,
  existingPositions?: Map<string, { x: number; y: number }>,
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
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const entry of entries) {
    g.setNode(entry.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const [sourceId, targets] of graph.edges) {
    if (!g.hasNode(sourceId)) continue
    for (const targetId of targets) {
      if (!g.hasNode(targetId)) continue
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
