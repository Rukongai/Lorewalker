import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { T } from '../../theme/tokens'
import {
  useWorkspaceStore,
  documentStoreRegistry,
  buildGraph,
  getReachableEntries,
  simulate,
} from '@lorewalker/core'
import type { WorkingEntry, RecursionGraph, ActivationResult, ActivatedEntry } from '@lorewalker/core'

const EMPTY_GRAPH: RecursionGraph = { edges: new Map(), reverseEdges: new Map(), edgeMeta: new Map() }

interface KeywordReachRow {
  keyword: string
  d1: number
  d2: number | null
  d3: number | null
  max: number | null
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

function reachColor(val: number): string {
  if (val > 80) return T.error
  if (val > 50) return T.warning
  return T.textPrimary
}

function CellValue({ val }: { val: number | null }) {
  if (val === null) {
    return <Text style={[styles.cell, { color: T.textMuted }]}>–</Text>
  }
  return <Text style={[styles.cell, { color: reachColor(val) }]}>{val}%</Text>
}

interface EntryInsightsViewProps {
  entryId: string
}

export function EntryInsightsView({ entryId }: EntryInsightsViewProps) {
  const [result, setResult] = useState<ActivationResult | null>(null)

  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null
  const entries = store?.getState().entries ?? []
  const bookMeta = store?.getState().bookMeta

  const graph = useMemo(
    () => (entries.length > 0 ? buildGraph(entries) : EMPTY_GRAPH),
    [entries],
  )

  const rows = useMemo(
    () => computeKeywordReachRows(entryId, graph, entries),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entryId, graph, entries.length],
  )

  const entry = entries.find((e) => e.id === entryId)
  const entryMap = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries])

  function handleSimulate() {
    if (!entry || !bookMeta) return
    const context = {
      messages: [{ role: 'user' as const, content: entry.content }],
      scanDepth: bookMeta.scanDepth,
      tokenBudget: bookMeta.tokenBudget,
      caseSensitive: bookMeta.caseSensitive,
      matchWholeWords: bookMeta.matchWholeWords,
      maxRecursionSteps: bookMeta.maxRecursionSteps,
      includeNames: false,
    }
    setResult(simulate(entries, context))
  }

  if (!store || !entry) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No lorebook loaded</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Keyword Reach Section */}
      <Text style={styles.sectionHeader}>Keyword Reach</Text>
      {rows.length === 0 ? (
        <Text style={styles.emptyState}>
          This entry triggers no other entries via keyword matching.
        </Text>
      ) : (
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.row}>
            <Text style={[styles.keywordCell, styles.headerText]}>Keyword</Text>
            <Text style={[styles.cell, styles.headerText]}>1</Text>
            <Text style={[styles.cell, styles.headerText]}>2</Text>
            <Text style={[styles.cell, styles.headerText]}>3</Text>
            <Text style={[styles.cell, styles.headerText]}>Max</Text>
          </View>
          {rows.map((row) => (
            <View key={row.keyword} style={styles.row}>
              <Text style={styles.keywordCell} numberOfLines={1} ellipsizeMode="tail">
                {row.keyword}
              </Text>
              <CellValue val={row.d1} />
              <CellValue val={row.d2} />
              <CellValue val={row.d3} />
              <CellValue val={row.max} />
            </View>
          ))}
        </View>
      )}

      <View style={styles.divider} />

      {/* Simulate Section */}
      <Text style={styles.sectionHeader}>Entry Simulation</Text>
      <Pressable
        onPress={handleSimulate}
        style={({ pressed }) => [styles.simulateButton, pressed && styles.simulateButtonPressed]}
      >
        <Text style={styles.simulateButtonText}>Simulate this entry</Text>
      </Pressable>

      {result !== null && (
        <View style={styles.results}>
          <Text style={styles.countBadge}>
            {result.activatedEntries.length} entr{result.activatedEntries.length === 1 ? 'y' : 'ies'} activated
          </Text>
          {result.activatedEntries.length === 0 ? (
            <Text style={styles.emptyState}>No entries were activated.</Text>
          ) : (
            result.activatedEntries.map((ae: ActivatedEntry) => {
              const e = entryMap.get(ae.entryId)
              return (
                <View key={ae.entryId} style={styles.resultRow}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {e?.name ?? ae.entryId}
                  </Text>
                  {ae.matchedKeywords.length > 0 && (
                    <Text style={styles.resultKeywords} numberOfLines={1}>
                      {ae.matchedKeywords.join(', ')}
                    </Text>
                  )}
                  <Text style={styles.resultTokens}>{ae.tokenCost} tk</Text>
                </View>
              )
            })
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, gap: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: T.textMuted, fontSize: 14 },
  emptyState: { color: T.textMuted, fontSize: 13, paddingVertical: 8 },
  sectionHeader: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  divider: { height: 1, backgroundColor: T.overlay, marginVertical: 16 },
  table: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  headerText: { color: T.textMuted, fontSize: 11, fontWeight: '600' },
  keywordCell: { flex: 1, color: T.textPrimary, fontSize: 12, paddingRight: 8 },
  cell: { width: 48, textAlign: 'right', fontSize: 12 },
  simulateButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: T.overlay,
    borderRadius: 8,
    marginBottom: 12,
  },
  simulateButtonPressed: { backgroundColor: T.muted },
  simulateButtonText: { color: T.textPrimary, fontSize: 13, fontWeight: '500' },
  results: { gap: 6 },
  countBadge: {
    color: T.success,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  resultName: { flex: 1, color: T.textPrimary, fontSize: 13 },
  resultKeywords: { color: T.selective, fontSize: 11, maxWidth: 120 },
  resultTokens: { color: T.textMuted, fontSize: 11, minWidth: 40, textAlign: 'right' },
})
