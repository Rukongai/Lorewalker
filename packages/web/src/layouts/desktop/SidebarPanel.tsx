import { useCallback, useMemo } from 'react'
import { ChevronRight, Maximize2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { simulate, categorizeEntry, llmService } from '@lorewalker/core'
import type { SimMessage, SimulationSettings, SimulationContext, WorkingEntry, BookMeta, Finding, LorebookFormat } from '@/types'
import { buildConnectionRows } from '@/features/health'
import { EditorView } from '@/features/editor'
import { HealthView } from '@/features/health'
import { SimulatorView } from '@/features/simulator'
import { KeywordsView } from '@/features/keywords'
import { Toggle } from '@/components/shared/Toggle'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export type SidebarPanelTab = 'edit' | 'health' | 'simulator' | 'keywords'

const TAB_LABELS: Record<SidebarPanelTab, string> = {
  edit: 'Edit',
  health: 'Health',
  simulator: 'Simulator',
  keywords: 'Keywords',
}

interface SidebarPanelProps {
  tab: SidebarPanelTab
  onTabChange: (tab: SidebarPanelTab) => void
  onCollapse: () => void
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
}

export function SidebarPanel({ tab, onTabChange, onCollapse, onOpenEntry, onSelectEntry }: SidebarPanelProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const llmProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)
  const { graph, findings, healthScore } = useDerivedState(activeTabId)

  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)
  const activeFormat = activeStore((s) => s.activeFormat)
  const simulatorState = activeStore((s) => s.simulatorState)
  const llmFindings = activeStore((s) => s.llmFindings)
  const selectedEntryId = activeStore((s) => s.selection.selectedEntryId)
  const selectedEntry = activeStore((s) => {
    const id = s.selection.selectedEntryId
    if (!id) return null
    return s.entries.find((e) => e.id === id) ?? null
  })

  const scope: 'entry' | 'lorebook' = selectedEntryId ? 'entry' : 'lorebook'

  const entryFindings = useMemo(
    () => selectedEntryId ? findings.filter((f) => f.entryIds.includes(selectedEntryId)) : [],
    [findings, selectedEntryId]
  )

  const connections = useMemo(
    () => selectedEntry ? buildConnectionRows(selectedEntryId!, entries, graph) : { incoming: [], outgoing: [] },
    [selectedEntryId, entries, graph, selectedEntry]
  )

  const handleEntryChange = useCallback((patch: Partial<WorkingEntry>) => {
    if (!realStore || !selectedEntry) return
    realStore.getState().updateEntry(selectedEntry.id, patch)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, selectedEntry, activeTabId])

  const handleBookMetaChange = useCallback(<K extends keyof BookMeta>(field: K, value: BookMeta[K]) => {
    realStore?.getState().updateBookMeta({ [field]: value } as Partial<BookMeta>)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, activeTabId])

  const handleFormatChange = useCallback((format: LorebookFormat) => {
    realStore?.getState().setActiveFormat(format)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, activeTabId])

  const handleToggleEnabled = useCallback(() => {
    if (!realStore || !selectedEntry) return
    realStore.getState().updateEntry(selectedEntry.id, { enabled: !selectedEntry.enabled })
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, selectedEntry, activeTabId])

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

  const handleSimulateEntry = useCallback((entry: WorkingEntry) => {
    if (!realStore) return
    const state = realStore.getState()
    const context: SimulationContext = {
      messages: [{ role: 'user', content: entry.content }],
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

  const handleCategorizeEntry = useCallback(async () => {
    if (!realStore || !selectedEntry || !llmProviderId) return
    const category = await categorizeEntry(selectedEntry, llmService, llmProviderId)
    realStore.getState().updateEntry(selectedEntry.id, { userCategory: category })
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, selectedEntry, llmProviderId, activeTabId])

  const handleDeepAnalysisComplete = useCallback((newFindings: Finding[]) => {
    realStore?.getState().setLlmFindings(newFindings)
  }, [realStore])

  const handleEntrySelect = useCallback((entryId: string) => {
    onSelectEntry(entryId)
    realStore?.getState().selectEntry(entryId)
  }, [onSelectEntry, realStore])

  const navigate = useCallback((entryId: string) => {
    realStore?.getState().selectEntry(entryId)
  }, [realStore])

  return (
    <>
      {/* Panel header with tabs */}
      <div className="border-b border-ctp-surface0 shrink-0 flex flex-wrap items-center px-1">
        <div className="flex flex-wrap flex-1">
          {(['edit', 'health', 'simulator', 'keywords'] as SidebarPanelTab[]).map((t) => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`px-2.5 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors border-b-2 ${
                tab === t
                  ? 'text-ctp-accent border-ctp-accent'
                  : 'text-ctp-overlay1 border-transparent hover:text-ctp-subtext1'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <Tooltip text="Collapse panel">
          <button
            onClick={onCollapse}
            className="p-1 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Tab: Edit */}
      {tab === 'edit' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {scope === 'entry' && selectedEntry && (
            <div className="flex items-center border-b border-ctp-surface0 shrink-0 px-3 py-1.5 gap-2">
              <span className="flex-1 text-xs font-medium text-ctp-subtext0 truncate">
                {selectedEntry.name || 'Untitled'}
              </span>
              <Toggle
                checked={selectedEntry.enabled}
                onChange={handleToggleEnabled}
                aria-label={selectedEntry.enabled ? 'Disable entry' : 'Enable entry'}
              />
              <Tooltip text="Open in full editor">
                <button
                  onClick={() => onOpenEntry(selectedEntryId!)}
                  className="p-1 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
                >
                  <Maximize2 size={12} />
                </button>
              </Tooltip>
            </div>
          )}
          {scope === 'entry' ? (
            selectedEntryId ? (
              <ErrorBoundary label="Editor">
                <EditorView
                  scope="entry"
                  activeFormat={activeFormat}
                  entry={selectedEntry ?? undefined}
                  graph={graph}
                  onEntryChange={handleEntryChange}
                  onCategorize={llmProviderId ? handleCategorizeEntry : undefined}
                  connections={connections}
                  onNavigate={navigate}
                />
              </ErrorBoundary>
            ) : activeTabId ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-ctp-overlay1">Select an entry to edit</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-ctp-overlay1">No file open</p>
              </div>
            )
          ) : (
            activeTabId ? (
              <EditorView
                scope="lorebook"
                activeFormat={activeFormat}
                bookMeta={bookMeta}
                onBookMetaChange={handleBookMetaChange}
                onFormatChange={handleFormatChange}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-ctp-overlay1">No file open</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Tab: Health */}
      {tab === 'health' && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          <ErrorBoundary label="Health">
            <HealthView
              scope={scope}
              findings={scope === 'lorebook' ? [...findings, ...llmFindings] : undefined}
              healthScore={scope === 'lorebook' ? healthScore : undefined}
              entries={entries}
              graph={graph}
              bookMeta={bookMeta}
              entry={selectedEntry ?? undefined}
              entryFindings={scope === 'entry' ? entryFindings : undefined}
              llmProviderId={scope === 'lorebook' ? (llmProviderId ?? undefined) : undefined}
              onDeepAnalysisComplete={scope === 'lorebook' ? handleDeepAnalysisComplete : undefined}
              onEntrySelect={scope === 'lorebook' ? handleEntrySelect : navigate}
              onEntryOpen={scope === 'lorebook' ? onOpenEntry : navigate}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Tab: Simulator */}
      {tab === 'simulator' && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          <ErrorBoundary label="Simulator">
            <SimulatorView
              scope={scope}
              entries={entries}
              bookMeta={bookMeta}
              simulatorState={simulatorState}
              entry={selectedEntry ?? undefined}
              onRunSimulation={handleRunSimulation}
              onUpdateSettings={handleUpdateSettings}
              onSetMessages={handleSetMessages}
              onSimulateEntry={scope === 'entry' ? handleSimulateEntry : undefined}
              onEntrySelect={scope === 'lorebook' ? handleEntrySelect : navigate}
              onEntryOpen={scope === 'lorebook' ? onOpenEntry : navigate}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Tab: Keywords */}
      {tab === 'keywords' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <KeywordsView
            scope={scope}
            entries={entries}
            bookMeta={bookMeta}
            entry={selectedEntry ?? undefined}
            graph={graph}
            onEntrySelect={scope === 'lorebook' ? handleEntrySelect : navigate}
            onEntryOpen={scope === 'lorebook' ? onOpenEntry : navigate}
          />
        </div>
      )}
    </>
  )
}
