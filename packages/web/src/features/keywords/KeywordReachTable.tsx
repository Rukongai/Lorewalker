import { useMemo } from 'react'
import type { WorkingEntry, RecursionGraph } from '@/types'
import { getReachableEntries } from '@/services/graph-service'

export interface KeywordReachTableProps {
  entryId: string
  graph: RecursionGraph
  entries: WorkingEntry[]
}

export interface LorebookKeywordReachTableProps {
  graph: RecursionGraph
  entries: WorkingEntry[]
}

interface KeywordReachRow {
  keyword: string
  d1: number
  d2: number | null  // null = stabilized before this depth
  d3: number | null
  max: number | null // null = already shown in d3 (or d2/d1)
}

function computePctAt(
  directTargets: Set<string>,
  graph: RecursionGraph,
  depth: number,
  totalOther: number,
): number {
  const reachable = new Set<string>(directTargets)
  if (depth > 1) {
    for (const tid of directTargets) {
      const further = getReachableEntries(tid, graph, depth - 1)
      for (const id of further) reachable.add(id)
    }
  }
  return Math.round((reachable.size / totalOther) * 100)
}

function computeKeywordReachRows(
  entryId: string,
  graph: RecursionGraph,
  entries: WorkingEntry[],
): KeywordReachRow[] {
  const totalOther = entries.length - 1
  if (totalOther <= 0) return []

  const outgoing = graph.edges.get(entryId)
  if (!outgoing || outgoing.size === 0) return []

  // Build map: keyword → Set<targetId> (from non-blocked outgoing edges)
  const kwTargets = new Map<string, Set<string>>()
  for (const targetId of outgoing) {
    const edgeKey = `${entryId}\u2192${targetId}`
    const meta = graph.edgeMeta.get(edgeKey)
    if (!meta) continue
    if (meta.blockedByPreventRecursion || meta.blockedByExcludeRecursion) continue
    for (const kw of meta.matchedKeywords) {
      if (!kwTargets.has(kw)) kwTargets.set(kw, new Set())
      kwTargets.get(kw)!.add(targetId)
    }
  }

  if (kwTargets.size === 0) return []

  const rows: KeywordReachRow[] = []

  for (const [kw, directTargets] of kwTargets) {
    const pct1 = computePctAt(directTargets, graph, 1, totalOther)
    const pct2 = computePctAt(directTargets, graph, 2, totalOther)
    const pct3 = computePctAt(directTargets, graph, 3, totalOther)

    let d2: number | null = null
    let d3: number | null = null
    let max: number | null = null

    if (pct1 === pct2) {
      // Stabilized at depth 1
      d2 = null
      d3 = null
      max = null
    } else if (pct2 === pct3) {
      // Stabilized at depth 2
      d2 = pct2
      d3 = null
      max = null
    } else {
      d2 = pct2
      d3 = pct3

      // Run deeper until stable (safety cap: depth 20)
      let prevPct = pct3
      let stabilized = false

      for (let depth = 4; depth <= 20; depth++) {
        const pctD = computePctAt(directTargets, graph, depth, totalOther)
        if (pctD === prevPct) {
          // Stabilized — prevPct === pct3 means no change beyond d3
          max = prevPct === pct3 ? null : prevPct
          stabilized = true
          break
        }
        prevPct = pctD
      }

      if (!stabilized) {
        // Safety cap reached — treat last computed value as max
        max = prevPct === pct3 ? null : prevPct
      }
    }

    rows.push({ keyword: kw, d1: pct1, d2, d3, max })
  }

  // Sort by d1 descending (highest first-step reach at top)
  rows.sort((a, b) => b.d1 - a.d1)

  return rows
}

function reachColor(val: number): string {
  if (val > 80) return 'text-ctp-red'
  if (val > 50) return 'text-ctp-yellow'
  return 'text-ctp-text'
}

function renderCell(val: number | null, extraClass?: string): React.ReactNode {
  if (val === null) {
    return (
      <span className={`w-10 text-right text-xs tabular-nums text-ctp-overlay0 ${extraClass ?? ''}`}>
        -
      </span>
    )
  }
  return (
    <span className={`w-10 text-right text-xs tabular-nums ${reachColor(val)} ${extraClass ?? ''}`}>
      {val}%
    </span>
  )
}

export function KeywordReachTable({ entryId, graph, entries }: KeywordReachTableProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => computeKeywordReachRows(entryId, graph, entries), [entryId, graph, entries.length])

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="text-sm text-ctp-overlay1 text-center px-4">
          This entry triggers no other entries via keyword matching.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Header */}
      <div className="flex items-center gap-1 px-1 mb-0.5">
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          Keyword
        </span>
        <span className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          1
        </span>
        <span className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          2
        </span>
        <span className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          3
        </span>
        <span className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          Max
        </span>
      </div>
      {/* Data rows */}
      {rows.map((row) => (
        <div key={row.keyword} className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-ctp-surface0">
          <span
            className="flex-1 min-w-0 text-xs text-ctp-text truncate"
            title={row.keyword}
          >
            {row.keyword}
          </span>
          {renderCell(row.d1)}
          {renderCell(row.d2)}
          {renderCell(row.d3)}
          {renderCell(row.max)}
        </div>
      ))}
    </div>
  )
}

// --- Lorebook-scope keyword reach ---

function computeLorebookKeywordReachRows(
  graph: RecursionGraph,
  entries: WorkingEntry[],
): KeywordReachRow[] {
  const totalOther = entries.length
  if (totalOther <= 0) return []

  // Aggregate across all edges: keyword → union of all direct targets
  const kwTargets = new Map<string, Set<string>>()
  for (const [sourceId, targets] of graph.edges) {
    for (const targetId of targets) {
      const edgeKey = `${sourceId}\u2192${targetId}`
      const meta = graph.edgeMeta.get(edgeKey)
      if (!meta) continue
      if (meta.blockedByPreventRecursion || meta.blockedByExcludeRecursion) continue
      for (const kw of meta.matchedKeywords) {
        if (!kwTargets.has(kw)) kwTargets.set(kw, new Set())
        kwTargets.get(kw)!.add(targetId)
      }
    }
  }

  if (kwTargets.size === 0) return []

  const rows: KeywordReachRow[] = []

  for (const [kw, directTargets] of kwTargets) {
    const pct1 = computePctAt(directTargets, graph, 1, totalOther)
    const pct2 = computePctAt(directTargets, graph, 2, totalOther)
    const pct3 = computePctAt(directTargets, graph, 3, totalOther)

    let d2: number | null = null
    let d3: number | null = null
    let max: number | null = null

    if (pct1 === pct2) {
      d2 = null
      d3 = null
      max = null
    } else if (pct2 === pct3) {
      d2 = pct2
      d3 = null
      max = null
    } else {
      d2 = pct2
      d3 = pct3

      let prevPct = pct3
      let stabilized = false
      for (let depth = 4; depth <= 20; depth++) {
        const pctD = computePctAt(directTargets, graph, depth, totalOther)
        if (pctD === prevPct) {
          max = prevPct === pct3 ? null : prevPct
          stabilized = true
          break
        }
        prevPct = pctD
      }
      if (!stabilized) {
        max = prevPct === pct3 ? null : prevPct
      }
    }

    rows.push({ keyword: kw, d1: pct1, d2, d3, max })
  }

  rows.sort((a, b) => b.d1 - a.d1)
  return rows
}

export function LorebookKeywordReachTable({ graph, entries }: LorebookKeywordReachTableProps) {
  const rows = useMemo(
    () => computeLorebookKeywordReachRows(graph, entries),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, entries.length],
  )

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="text-sm text-ctp-overlay1 text-center px-4">
          No keyword recursion edges found in this lorebook.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Header */}
      <div className="flex items-center gap-1 px-1 mb-0.5">
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          Keyword
        </span>
        <span className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          1
        </span>
        <span className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          2
        </span>
        <span className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          3
        </span>
        <span className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          Max
        </span>
      </div>
      {/* Data rows */}
      {rows.map((row) => (
        <div key={row.keyword} className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-ctp-surface0">
          <span className="flex-1 min-w-0 text-xs text-ctp-text truncate" title={row.keyword}>
            {row.keyword}
          </span>
          {renderCell(row.d1)}
          {renderCell(row.d2)}
          {renderCell(row.d3)}
          {renderCell(row.max)}
        </div>
      ))}
    </div>
  )
}
