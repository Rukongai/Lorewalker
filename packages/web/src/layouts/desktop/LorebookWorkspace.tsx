import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { simulate, simulateConversation, categorizeAll, llmService } from '@lorewalker/core'
import type { SimMessage, SimulationContext, Finding, RecursionGraph } from '@/types'
import { HealthScoreCard } from '@/features/health/HealthScoreCard'
import { DeepAnalysisTrigger } from '@/features/health/DeepAnalysisTrigger'
import { FindingsList } from '@/features/health/FindingsList'
import { FindingDetail } from '@/features/health/FindingDetail'
import { RulesView } from '@/features/rules'
import { InsightsView } from '@/features/insights'

export type LorebookWorkspaceTab = 'health' | 'rules' | 'insights'

const TAB_LABELS: Record<LorebookWorkspaceTab, string> = {
  health: 'Health',
  rules: 'Rules',
  insights: 'Insights',
}

const EMPTY_GRAPH: RecursionGraph = {
  edges: new Map(),
  reverseEdges: new Map(),
  edgeMeta: new Map(),
}

function severityIcon(severity: Finding['severity']) {
  if (severity === 'error') return <span className="text-ctp-red shrink-0">●</span>
  if (severity === 'warning') return <span className="text-ctp-yellow shrink-0">▲</span>
  return <span className="text-ctp-blue shrink-0">○</span>
}

function ruleDisplayName(ruleId: string): string {
  const slug = ruleId.split('/').pop() ?? ruleId
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// --- ViolationList: middle column in Health tab ---

interface ViolationListProps {
  findings: Finding[]
  ruleId: string | null
  selectedFindingId: string | null
  onSelectFinding: (finding: Finding) => void
}

function ViolationList({ findings, ruleId, selectedFindingId, onSelectFinding }: ViolationListProps) {
  if (!ruleId) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-ctp-overlay1">
        Select a rule to see violations
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-ctp-surface0 shrink-0">
        <p className="text-xs font-semibold text-ctp-text truncate">{ruleDisplayName(ruleId)}</p>
        <p className="text-[10px] text-ctp-overlay1">
          {findings.length} violation{findings.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {findings.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-ctp-overlay1">No violations</p>
          </div>
        ) : (
          findings.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelectFinding(f)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-ctp-surface0 last:border-b-0 transition-colors ${
                f.id === selectedFindingId
                  ? 'bg-ctp-surface1 border-l-2 border-l-ctp-accent'
                  : 'hover:bg-ctp-surface0'
              }`}
            >
              {severityIcon(f.severity)}
              <span className="flex-1 text-xs text-ctp-text truncate">{f.message}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export interface LorebookWorkspaceProps {
  tab: LorebookWorkspaceTab
  onTabChange: (tab: LorebookWorkspaceTab) => void
  onClose: () => void
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
}

export function LorebookWorkspace({
  tab,
  onTabChange,
  onClose,
  onOpenEntry,
  onSelectEntry,
}: LorebookWorkspaceProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const llmProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)
  const llmCategorization = useWorkspaceStore((s) => s.llmCategorization)
  const { graph, findings, healthScore } = useDerivedState(activeTabId)

  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)
  const simulatorState = activeStore((s) => s.simulatorState)
  const llmFindings = activeStore((s) => s.llmFindings)

  // Health tab state
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)

  // Insights/Simulator tab state
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)

  const handleRunSimulation = useCallback(() => {
    if (!realStore) return
    const state = realStore.getState()
    const context: SimulationContext = {
      messages: state.simulatorState.messages,
      scanDepth: state.simulatorState.settings.defaultScanDepth,
      tokenBudget: state.simulatorState.settings.defaultTokenBudget,
      caseSensitive: state.simulatorState.settings.defaultCaseSensitive,
      matchWholeWords: state.simulatorState.settings.defaultMatchWholeWords,
      maxRecursionSteps: state.simulatorState.settings.defaultMaxRecursionSteps,
      includeNames: state.simulatorState.settings.defaultIncludeNames,
    }
    const result = simulate(state.entries, context)
    state.setSimulatorResult(result)
    setSelectedStepIndex(null)
  }, [realStore])

  const handleSetMessages = useCallback((messages: SimMessage[]) => {
    realStore?.getState().setSimulatorMessages(messages)
  }, [realStore])

  const handleDeepAnalysisComplete = useCallback((newFindings: Finding[]) => {
    realStore?.getState().setLlmFindings(newFindings)
  }, [realStore])

  const handleCategorizeAll = useCallback(async (onProgress: (done: number, total: number) => void) => {
    if (!realStore || !llmProviderId) return
    const currentEntries = realStore.getState().entries
    const results = await categorizeAll(currentEntries, llmService, llmProviderId, onProgress, llmCategorization.skipManualOverrides)
    realStore.getState().setCategoryBatch(results)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, llmProviderId, llmCategorization.skipManualOverrides, activeTabId])

  const handleEntrySelect = useCallback((entryId: string) => {
    onSelectEntry(entryId)
    realStore?.getState().selectEntry(entryId)
  }, [onSelectEntry, realStore])

  const handleAddToConversation = useCallback(() => {
    if (!realStore) return
    const state = realStore.getState()
    const steps = simulateConversation(
      state.entries,
      state.simulatorState.messages,
      state.simulatorState.settings,
    )
    for (const step of steps) {
      state.appendConversationStep(step)
    }
  }, [realStore])

  const handleClearSimulation = useCallback(() => {
    realStore?.getState().clearSimulation()
  }, [realStore])

  const handleClearHistory = useCallback(() => {
    realStore?.getState().clearConversationHistory()
  }, [realStore])

  // Escape closes workspace (bubble phase — EntryWorkspace capture fires first)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const allFindings = [...findings, ...llmFindings]
  const resolvedGraph = graph ?? EMPTY_GRAPH

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '95vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-ctp-surface1 shrink-0">
          <div className="flex items-center gap-1">
            {(['health', 'rules', 'insights'] as LorebookWorkspaceTab[]).map((t) => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-ctp-accent text-ctp-base'
                    : 'text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <Tooltip text="Close (Esc)">
            <button
              onClick={onClose}
              className="p-1.5 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'health' && (
            healthScore ? (
              <div className="flex h-full overflow-hidden">
                {/* Left 240px: score + deep analysis + rule tree */}
                <div className="w-[240px] shrink-0 border-r border-ctp-surface0 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-ctp-surface0 shrink-0 flex flex-col gap-3">
                    <HealthScoreCard
                      score={healthScore.overall}
                      summary={healthScore.summary}
                      categories={healthScore.categories}
                      size="lg"
                    />
                    {llmProviderId && bookMeta && (
                      <DeepAnalysisTrigger
                        hasLlmProvider
                        providerId={llmProviderId}
                        context={{ entries, bookMeta, graph: resolvedGraph }}
                        onComplete={handleDeepAnalysisComplete}
                      />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <FindingsList
                      findings={allFindings}
                      groupByRule
                      onSelectRule={(ruleId) => {
                        setSelectedRuleId(ruleId)
                        setSelectedFinding(null)
                      }}
                      selectedRuleId={selectedRuleId}
                    />
                  </div>
                </div>

                {/* Middle ~35%: violations for selected rule */}
                <div className="w-[35%] min-w-[240px] border-r border-ctp-surface0 flex flex-col overflow-hidden">
                  <ViolationList
                    findings={allFindings.filter((f) => f.ruleId === selectedRuleId)}
                    ruleId={selectedRuleId}
                    selectedFindingId={selectedFinding?.id ?? null}
                    onSelectFinding={setSelectedFinding}
                  />
                </div>

                {/* Right flex-1: finding detail */}
                <div className="flex-1 overflow-hidden">
                  <FindingDetail
                    finding={selectedFinding}
                    entries={entries}
                    graph={resolvedGraph}
                    onOpenEntry={onOpenEntry}
                    onSelectEntry={handleEntrySelect}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-ctp-subtext0 text-sm">
                Open a lorebook to see analysis
              </div>
            )
          )}

          {tab === 'rules' && (
            <RulesView tabId={activeTabId} onOpenEntry={onOpenEntry} />
          )}

          {tab === 'insights' && (
            <InsightsView
              scope="lorebook"
              entries={entries}
              graph={resolvedGraph}
              onCategorizeAll={llmProviderId ? handleCategorizeAll : undefined}
              bookMeta={bookMeta ?? { name: '', description: '', scanDepth: 4, tokenBudget: 4096, contextSize: 200000, recursiveScan: false, caseSensitive: false, matchWholeWords: false, extensions: {}, minActivations: 0, maxDepth: 0, maxRecursionSteps: 0, insertionStrategy: 'evenly', includeNames: false, useGroupScoring: false, alertOnOverflow: false, budgetCap: 0 }}
              messages={simulatorState.messages}
              lastResult={simulatorState.lastResult}
              conversationHistory={simulatorState.conversationHistory}
              selectedStepIndex={selectedStepIndex}
              onRun={handleRunSimulation}
              onSetMessages={handleSetMessages}
              onAddToConversation={handleAddToConversation}
              onClearSimulation={handleClearSimulation}
              onClearHistory={handleClearHistory}
              onSelectStep={setSelectedStepIndex}
              onOpenEntry={onOpenEntry}
              onSelectEntry={handleEntrySelect}
            />
          )}
        </div>
      </div>
    </div>
  )
}
