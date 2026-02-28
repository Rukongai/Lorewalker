import type {
  WorkingEntry,
  RecursionGraph,
  EdgeMeta,
  CycleResult,
  DeadLink,
  KeywordMatchOptions,
} from '@/types'
import { doesEntryMatchText } from '@/services/simulator/keyword-matching'

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
