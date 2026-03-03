import { useCallback, useEffect, useState } from 'react'
import { Play, PlusCircle, RotateCcw, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { simulate, simulateConversation } from '@/services/simulator-service'
import type { SimMessage, SimulationContext, Finding, RecursionGraph, ConversationStep, ActivationResult } from '@/types'
import { HealthScoreCard } from '@/features/health/HealthScoreCard'
import { DeepAnalysisTrigger } from '@/features/health/DeepAnalysisTrigger'
import { FindingsList } from '@/features/health/FindingsList'
import { FindingDetail } from '@/features/health/FindingDetail'
import { MessageComposer } from '@/features/simulator/MessageComposer'
import { ActivationResultList } from '@/features/simulator/ActivationResultList'
import { RulesView } from '@/features/rules'
import { KeywordsView } from '@/features/keywords'

export type LorebookWorkspaceTab = 'health' | 'simulator' | 'rules' | 'keywords'

const TAB_LABELS: Record<LorebookWorkspaceTab, string> = {
  health: 'Health',
  simulator: 'Simulator',
  rules: 'Rules',
  keywords: 'Keywords',
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

// --- ConversationPane: left column in Simulator tab ---

interface ConversationPaneProps {
  messages: SimMessage[]
  lastResult: ActivationResult | null
  conversationHistory: ConversationStep[]
  onRun: () => void
  onSetMessages: (messages: SimMessage[]) => void
  onAddToConversation: () => void
  onClearSimulation: () => void
  onClearHistory: () => void
  selectedStepIndex: number | null
  onSelectStep: (i: number | null) => void
}

function ConversationPane({
  messages,
  lastResult,
  conversationHistory,
  onRun,
  onSetMessages,
  onAddToConversation,
  onClearSimulation,
  onClearHistory,
  selectedStepIndex,
  onSelectStep,
}: ConversationPaneProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Engine badge */}
      <div className="px-3 py-2 border-b border-ctp-surface0 shrink-0 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          Engine: SillyTavern
        </span>
      </div>

      {/* Messages section */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">Messages</p>
        <MessageComposer messages={messages} onChange={onSetMessages} />
      </div>

      {/* Action buttons */}
      <div className="px-3 py-2 border-t border-ctp-surface0 shrink-0 flex flex-col gap-2">
        <button
          onClick={onRun}
          disabled={messages.length === 0}
          className="flex items-center justify-center gap-1.5 py-1.5 text-xs bg-ctp-accent text-ctp-base rounded font-medium disabled:opacity-40 hover:opacity-90 transition-opacity w-full"
        >
          <Play size={11} />
          Run Simulation
        </button>

        {lastResult !== null && (
          <div className="flex gap-2">
            <Tooltip text="Clear result">
              <button
                onClick={onClearSimulation}
                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-ctp-overlay1 hover:text-ctp-text border border-ctp-surface1 hover:border-ctp-surface2 rounded transition-colors"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            </Tooltip>
            <Tooltip text="Append this result to conversation history">
              <button
                onClick={onAddToConversation}
                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-ctp-overlay1 hover:text-ctp-text border border-ctp-surface1 hover:border-ctp-surface2 rounded transition-colors"
              >
                <PlusCircle size={10} />
                Add to Conversation
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Conversation history */}
      {conversationHistory.length > 0 && (
        <div className="border-t border-ctp-surface0 shrink-0 max-h-[35%] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-ctp-surface0 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
              History ({conversationHistory.length})
            </p>
            <button
              onClick={() => { onClearHistory(); onSelectStep(null) }}
              className="text-[10px] text-ctp-overlay1 hover:text-ctp-red transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="overflow-y-auto">
            {conversationHistory.map((step, i) => (
              <button
                key={i}
                onClick={() => onSelectStep(selectedStepIndex === i ? null : i)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left border-b border-ctp-surface0 last:border-b-0 transition-colors text-xs ${
                  selectedStepIndex === i
                    ? 'bg-ctp-surface1 text-ctp-text'
                    : 'text-ctp-subtext1 hover:bg-ctp-surface0'
                }`}
              >
                <span className="text-[10px] text-ctp-overlay1 shrink-0 tabular-nums w-4">#{i + 1}</span>
                <span className={`text-[10px] font-semibold shrink-0 ${
                  step.message.role === 'user' ? 'text-ctp-blue' :
                  step.message.role === 'assistant' ? 'text-ctp-green' : 'text-ctp-yellow'
                }`}>{step.message.role}</span>
                <span className="truncate text-[10px] text-ctp-subtext0">{step.message.content}</span>
                <span className="text-[10px] text-ctp-overlay1 shrink-0 tabular-nums">
                  {step.result.activatedEntries.length}↑
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
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
  const { graph, findings, healthScore } = useDerivedState(activeTabId)

  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)
  const simulatorState = activeStore((s) => s.simulatorState)
  const llmFindings = activeStore((s) => s.llmFindings)

  const [initialKeyword, setInitialKeyword] = useState<string | null>(null)

  // Health tab state
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)

  // Simulator tab state
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

  const displayResult =
    selectedStepIndex !== null
      ? simulatorState.conversationHistory[selectedStepIndex]?.result ?? null
      : simulatorState.lastResult

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
            {(['health', 'simulator', 'rules', 'keywords'] as LorebookWorkspaceTab[]).map((t) => (
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

          {tab === 'simulator' && (
            <div className="flex h-full overflow-hidden">
              {/* Left 40%: conversation pane */}
              <div className="w-[40%] min-w-[300px] border-r border-ctp-surface0 flex flex-col overflow-hidden">
                <ConversationPane
                  messages={simulatorState.messages}
                  lastResult={simulatorState.lastResult}
                  conversationHistory={simulatorState.conversationHistory}
                  onRun={handleRunSimulation}
                  onSetMessages={handleSetMessages}
                  onAddToConversation={handleAddToConversation}
                  onClearSimulation={handleClearSimulation}
                  onClearHistory={handleClearHistory}
                  selectedStepIndex={selectedStepIndex}
                  onSelectStep={setSelectedStepIndex}
                />
              </div>

              {/* Right 60%: results */}
              <div className="flex-1 overflow-hidden">
                <ActivationResultList
                  result={displayResult}
                  entries={entries}
                  onSelectEntry={handleEntrySelect}
                  onOpenEntry={onOpenEntry}
                />
              </div>
            </div>
          )}

          {tab === 'rules' && (
            <RulesView tabId={activeTabId} onOpenEntry={onOpenEntry} />
          )}
          {tab === 'keywords' && (
            <KeywordsView
              scope="lorebook"
              entries={entries}
              bookMeta={bookMeta}
              onEntrySelect={handleEntrySelect}
              onEntryOpen={onOpenEntry}
              initialKeyword={initialKeyword}
              onInitialKeywordConsumed={() => setInitialKeyword(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
