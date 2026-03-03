import { useState } from 'react'
import type { Finding, HealthScore, WorkingEntry, RecursionGraph, BookMeta, AnalysisContext, Rubric } from '../../types'
import type { ConnectionRow } from './ConnectionsList'
import { computeHealthScore } from '../../services/analysis/analysis-service'
import { defaultRubric } from '../../services/analysis/default-rubric'
import { HealthScoreCard } from './HealthScoreCard'
import { FindingsList } from './FindingsList'
import { FindingDetail } from './FindingDetail'
import { ConnectionsList } from './ConnectionsList'
import { DeepAnalysisTrigger } from './DeepAnalysisTrigger'

export interface HealthViewProps {
  scope: 'lorebook' | 'entry'
  // Lorebook scope
  findings?: Finding[]
  healthScore?: HealthScore
  entries?: WorkingEntry[]
  graph?: RecursionGraph
  bookMeta?: BookMeta
  // Entry scope
  entry?: WorkingEntry
  entryFindings?: Finding[]
  activeRubric?: Rubric
  // Deep analysis (lorebook scope, optional)
  llmProviderId?: string
  onDeepAnalysisComplete?: (findings: Finding[]) => void
  // Shared navigation
  onEntrySelect?: (entryId: string) => void
  onEntryOpen?: (entryId: string) => void
}

const EMPTY_GRAPH: RecursionGraph = {
  edges: new Map(),
  reverseEdges: new Map(),
  edgeMeta: new Map(),
}

export function buildConnectionRows(
  entryId: string,
  entries: WorkingEntry[],
  graph: RecursionGraph
): { incoming: ConnectionRow[]; outgoing: ConnectionRow[] } {
  const entryMap = new Map(entries.map(e => [e.id, e]))

  const incoming: ConnectionRow[] = []
  const outgoing: ConnectionRow[] = []

  const sources = graph.reverseEdges.get(entryId) ?? new Set<string>()
  for (const sourceId of sources) {
    const meta = graph.edgeMeta.get(`${sourceId}\u2192${entryId}`)
    if (!meta) continue
    const peer = entryMap.get(sourceId)
    incoming.push({
      id: sourceId,
      name: peer?.name ?? sourceId,
      keywords: meta.matchedKeywords,
      blocked: meta.blockedByPreventRecursion || meta.blockedByExcludeRecursion,
    })
  }

  const targets = graph.edges.get(entryId) ?? new Set<string>()
  for (const targetId of targets) {
    const meta = graph.edgeMeta.get(`${entryId}\u2192${targetId}`)
    if (!meta) continue
    const peer = entryMap.get(targetId)
    outgoing.push({
      id: targetId,
      name: peer?.name ?? targetId,
      keywords: meta.matchedKeywords,
      blocked: meta.blockedByPreventRecursion || meta.blockedByExcludeRecursion,
    })
  }

  return { incoming, outgoing }
}

export function HealthView({
  scope,
  findings,
  healthScore,
  entries = [],
  graph,
  bookMeta,
  entry,
  entryFindings,
  activeRubric,
  llmProviderId,
  onDeepAnalysisComplete,
  onEntrySelect,
  onEntryOpen,
}: HealthViewProps) {
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)

  // --- Lorebook scope ---
  if (scope === 'lorebook') {
    if (!healthScore) {
      return (
        <div className="flex items-center justify-center h-full text-ctp-subtext0 text-sm">
          Open a lorebook to see analysis
        </div>
      )
    }

    const resolvedGraph = graph ?? EMPTY_GRAPH
    const selectedFinding = findings?.find(f => f.id === selectedFindingId) ?? null
    const analysisContext: AnalysisContext = {
      entries,
      bookMeta: bookMeta!,
      graph: resolvedGraph,
    }

    return (
      <div className="flex flex-col gap-4 p-3">
        <HealthScoreCard
          score={healthScore.overall}
          summary={healthScore.summary}
          categories={healthScore.categories}
          size="lg"
        />

        {llmProviderId && bookMeta && onDeepAnalysisComplete && (
          <DeepAnalysisTrigger
            hasLlmProvider
            providerId={llmProviderId}
            context={analysisContext}
            onComplete={onDeepAnalysisComplete}
          />
        )}

        <FindingsList
          findings={findings ?? []}
          onSelectEntry={id => {
            onEntrySelect?.(id)
          }}
        />

        {selectedFinding && (
          <FindingDetail
            finding={selectedFinding}
            entries={entries}
            graph={resolvedGraph}
            onOpenEntry={id => onEntryOpen?.(id)}
            onSelectEntry={id => {
              setSelectedFindingId(null)
              onEntrySelect?.(id)
            }}
          />
        )}
      </div>
    )
  }

  // --- Entry scope ---
  const resolvedFindings = entryFindings ?? []
  // Use the assembled activeRubric (with disabled rules and custom rules applied) when available.
  // Fallback to defaultRubric only when called outside a document context.
  const entryScore = computeHealthScore(resolvedFindings, activeRubric ?? defaultRubric).overall

  const connections = entry && graph
    ? buildConnectionRows(entry.id, entries, graph)
    : { incoming: [], outgoing: [] }

  return (
    <div className="flex flex-col gap-4 p-3">
      <HealthScoreCard score={entryScore} size="sm" />

      <FindingsList
        findings={resolvedFindings}
        onSelectEntry={id => onEntrySelect?.(id)}
      />

      <ConnectionsList
        incoming={connections.incoming}
        outgoing={connections.outgoing}
        onNavigate={id => onEntrySelect?.(id)}
      />
    </div>
  )
}
