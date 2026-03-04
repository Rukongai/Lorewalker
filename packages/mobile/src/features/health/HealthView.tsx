import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { T } from '../../theme/tokens'
import {
  useWorkspaceStore,
  documentStoreRegistry,
  createDocumentStore,
  buildGraph,
  computeHealthScore,
  defaultRubric,
  runLLMRules,
  llmService,
} from '@lorewalker/core'
import type { WorkingEntry, RecursionGraph, Finding } from '@lorewalker/core'
import { HealthScoreCard } from './HealthScoreCard'
import { FindingsList } from './FindingsList'
import { ConnectionsList } from './ConnectionsList'
import type { ConnectionRow } from './ConnectionsList'

const EMPTY_GRAPH: RecursionGraph = { edges: new Map(), reverseEdges: new Map(), edgeMeta: new Map() }

const EMPTY_STORE = createDocumentStore({
  entries: [],
  bookMeta: {
    name: '', description: '', scanDepth: 4, tokenBudget: 4096,
    contextSize: 200000, recursiveScan: false, caseSensitive: false,
    matchWholeWords: false, extensions: {}, minActivations: 0,
    maxDepth: 0, maxRecursionSteps: 0, insertionStrategy: 'evenly',
    includeNames: false, useGroupScoring: false, alertOnOverflow: false, budgetCap: 0,
  },
})

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

export function LorebookHealthView({ topInset = 0, bottomInset = 0 }: { topInset?: number; bottomInset?: number }) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const activeLlmProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null
  const activeStore = store ?? EMPTY_STORE
  const findings = activeStore((s) => s.findings)
  const healthScore = activeStore((s) => s.healthScore)
  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)
  const [llmFindings, setLlmFindings] = useState<Finding[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  if (!store) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Open a lorebook to see analysis</Text>
      </View>
    )
  }

  async function handleDeepAnalysis() {
    if (!activeLlmProviderId) return
    setAnalyzing(true)
    try {
      const graph = buildGraph(entries)
      const ctx = { entries, bookMeta, graph, llmService }
      const results = await runLLMRules(ctx, defaultRubric)
      setLlmFindings(results)
    } catch (err) {
      console.warn('[HealthView] Deep analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const allFindings = [...findings, ...llmFindings]

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.content, { paddingTop: 16 + topInset, paddingBottom: 16 + bottomInset }]}>
      <HealthScoreCard
        score={healthScore.overall}
        summary={healthScore.summary}
        categories={healthScore.categories}
        size="lg"
      />
      {activeLlmProviderId && (
        <Pressable
          onPress={() => void handleDeepAnalysis()}
          disabled={analyzing}
          style={({ pressed }) => [styles.deepBtn, pressed && styles.deepBtnPressed]}
        >
          {analyzing
            ? <ActivityIndicator size="small" color={T.accent} />
            : <Text style={styles.deepBtnText}>Deep Analysis (AI)</Text>
          }
        </Pressable>
      )}
      <View style={styles.divider} />
      <FindingsList findings={allFindings} />
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
  const activeStore = store ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)
  const allFindings = activeStore((s) => s.findings)

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
  scrollContainer: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, gap: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: T.textMuted, fontSize: 14 },
  divider: { height: 1, backgroundColor: T.overlay, marginVertical: 12 },
  connectionsContainer: { height: 200 },
  deepBtn: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: T.overlay,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.muted,
  },
  deepBtnPressed: { backgroundColor: T.muted },
  deepBtnText: { color: T.accent, fontSize: 14, fontWeight: '600' },
})
