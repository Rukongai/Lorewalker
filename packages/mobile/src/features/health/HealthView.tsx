import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import {
  useWorkspaceStore,
  documentStoreRegistry,
  buildGraph,
  computeHealthScore,
  defaultRubric,
} from '@lorewalker/core'
import type { WorkingEntry, RecursionGraph } from '@lorewalker/core'
import { HealthScoreCard } from './HealthScoreCard'
import { FindingsList } from './FindingsList'
import { ConnectionsList } from './ConnectionsList'
import type { ConnectionRow } from './ConnectionsList'

const EMPTY_GRAPH: RecursionGraph = { edges: new Map(), reverseEdges: new Map(), edgeMeta: new Map() }

function buildConnectionRows(
  entryId: string,
  entries: WorkingEntry[],
  graph: RecursionGraph
): { incoming: ConnectionRow[]; outgoing: ConnectionRow[] } {
  const entryMap = new Map(entries.map((e) => [e.id, e]))
  const incoming: ConnectionRow[] = []
  const outgoing: ConnectionRow[] = []

  const sources = graph.reverseEdges.get(entryId) ?? new Set<string>()
  for (const sourceId of sources) {
    const meta = graph.edgeMeta.get(`${sourceId}\u2192${entryId}`)
    if (!meta) continue
    const peer = entryMap.get(sourceId)
    incoming.push({ id: sourceId, name: peer?.name ?? sourceId, keywords: meta.matchedKeywords, blocked: meta.blockedByPreventRecursion || meta.blockedByExcludeRecursion })
  }

  const targets = graph.edges.get(entryId) ?? new Set<string>()
  for (const targetId of targets) {
    const meta = graph.edgeMeta.get(`${entryId}\u2192${targetId}`)
    if (!meta) continue
    const peer = entryMap.get(targetId)
    outgoing.push({ id: targetId, name: peer?.name ?? targetId, keywords: meta.matchedKeywords, blocked: meta.blockedByPreventRecursion || meta.blockedByExcludeRecursion })
  }

  return { incoming, outgoing }
}

// --- Lorebook scope ---

export function LorebookHealthView() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null
  const findings = store?.getState().findings ?? []
  const healthScore = store?.getState().healthScore ?? null

  if (!healthScore || !store) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Open a lorebook to see analysis</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
      <HealthScoreCard
        score={healthScore.overall}
        summary={healthScore.summary}
        categories={healthScore.categories}
        size="lg"
      />
      <View style={styles.divider} />
      <FindingsList findings={findings} />
    </ScrollView>
  )
}

// --- Entry scope ---

interface EntryHealthViewProps {
  entryId: string
}

export function EntryHealthView({ entryId }: EntryHealthViewProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null
  const entries = store?.getState().entries ?? []
  const allFindings = store?.getState().findings ?? []

  const entryFindings = allFindings.filter((f) => f.entryIds.includes(entryId))
  const entryScore = computeHealthScore(entryFindings, defaultRubric).overall

  const graph = useMemo(
    () => entries.length > 0 ? buildGraph(entries) : EMPTY_GRAPH,
    [entries]
  )

  const connections = useMemo(
    () => buildConnectionRows(entryId, entries, graph),
    [entryId, entries, graph]
  )

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
      <HealthScoreCard score={entryScore} size="sm" />
      <View style={styles.divider} />
      <FindingsList findings={entryFindings} />
      <View style={styles.divider} />
      <View style={styles.connectionsContainer}>
        <ConnectionsList incoming={connections.incoming} outgoing={connections.outgoing} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#1e1e2e' },
  content: { padding: 16, gap: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6c7086', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#313244', marginVertical: 12 },
  connectionsContainer: { height: 200 },
})
