import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { simulate } from '@/services/simulator-service'
import type { SimMessage, SimulationSettings, SimulationContext, Finding } from '@/types'
import { HealthView } from '@/features/health'
import { SimulatorView } from '@/features/simulator'
import { RulesView } from '@/features/rules'
import { KeywordsView } from '@/features/keywords'

export type LorebookWorkspaceTab = 'health' | 'simulator' | 'rules' | 'keywords'

const TAB_LABELS: Record<LorebookWorkspaceTab, string> = {
  health: 'Health',
  simulator: 'Simulator',
  rules: 'Rules',
  keywords: 'Keywords',
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
  const activeFormat = activeStore((s) => s.activeFormat)
  const llmFindings = activeStore((s) => s.llmFindings)

  const [initialKeyword, setInitialKeyword] = useState<string | null>(null)

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
  }, [realStore])

  const handleUpdateSettings = useCallback((patch: Partial<SimulationSettings>) => {
    realStore?.getState().updateSimulatorSettings(patch)
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

  // Escape closes workspace (bubble phase — EntryWorkspace capture fires first)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
            <div className="h-full overflow-y-auto">
              <HealthView
                scope="lorebook"
                findings={[...findings, ...llmFindings]}
                healthScore={healthScore}
                entries={entries}
                graph={graph}
                bookMeta={bookMeta}
                llmProviderId={llmProviderId ?? undefined}
                onDeepAnalysisComplete={handleDeepAnalysisComplete}
                onEntrySelect={handleEntrySelect}
                onEntryOpen={onOpenEntry}
              />
            </div>
          )}
          {tab === 'simulator' && (
            <div className="h-full overflow-hidden">
              <SimulatorView
                scope="lorebook"
                entries={entries}
                bookMeta={bookMeta}
                simulatorState={simulatorState}
                graph={graph}
                onRunSimulation={handleRunSimulation}
                onUpdateSettings={handleUpdateSettings}
                onSetMessages={handleSetMessages}
                onEntrySelect={handleEntrySelect}
                onEntryOpen={onOpenEntry}
              />
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
              activeFormat={activeFormat}
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
