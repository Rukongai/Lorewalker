import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { simulate } from '@/services/simulator-service'
import type { SimMessage, SimulationSettings, SimulationContext, WorkingEntry } from '@/types'
import { buildConnectionRows } from '@/features/health'
import { EditorView } from '@/features/editor'
import { HealthView } from '@/features/health'
import { SimulatorView } from '@/features/simulator'
import { KeywordsView } from '@/features/keywords'

export type EntryWorkspaceTab = 'edit' | 'health' | 'simulator' | 'keywords'

const TAB_LABELS: Record<EntryWorkspaceTab, string> = {
  edit: 'Edit',
  health: 'Health',
  simulator: 'Simulator',
  keywords: 'Keywords',
}

interface EntryWorkspaceProps {
  entryId: string
  onClose: () => void
}

export function EntryWorkspace({ entryId, onClose }: EntryWorkspaceProps) {
  const [currentEntryId, setCurrentEntryId] = useState(entryId)
  const [backStack, setBackStack] = useState<string[]>([])
  const [forwardStack, setForwardStack] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<EntryWorkspaceTab>('edit')

  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const { graph, findings } = useDerivedState(activeTabId)

  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)
  const simulatorState = activeStore((s) => s.simulatorState)
  const activeFormat = activeStore((s) => s.activeFormat)

  const entryMap = useMemo(() => new Map(entries.map((e) => [e.id, e.name])), [entries])
  const currentEntry = useMemo(
    () => entries.find((e) => e.id === currentEntryId),
    [entries, currentEntryId]
  )
  const entryFindings = useMemo(
    () => findings.filter((f) => f.entryIds.includes(currentEntryId)),
    [findings, currentEntryId]
  )
  const connections = useMemo(
    () => currentEntry ? buildConnectionRows(currentEntryId, entries, graph) : { incoming: [], outgoing: [] },
    [currentEntryId, entries, graph, currentEntry]
  )

  const navigate = useCallback((id: string) => {
    setBackStack((prev) => [...prev, currentEntryId])
    setCurrentEntryId(id)
    setForwardStack([])
  }, [currentEntryId])

  const goBack = useCallback(() => {
    if (backStack.length === 0) return
    const prev = backStack[backStack.length - 1]
    setBackStack((s) => s.slice(0, -1))
    setForwardStack((s) => [currentEntryId, ...s])
    setCurrentEntryId(prev)
  }, [backStack, currentEntryId])

  const goForward = useCallback(() => {
    if (forwardStack.length === 0) return
    const next = forwardStack[0]
    setBackStack((s) => [...s, currentEntryId])
    setForwardStack((s) => s.slice(1))
    setCurrentEntryId(next)
  }, [forwardStack, currentEntryId])

  const handleEntryChange = useCallback((patch: Partial<WorkingEntry>) => {
    if (!realStore || !currentEntry) return
    realStore.getState().updateEntry(currentEntryId, patch)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, currentEntry, currentEntryId, activeTabId])

  const handleUpdateEntry = useCallback((id: string, changes: Partial<WorkingEntry>) => {
    if (!realStore) return
    realStore.getState().updateEntry(id, changes)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, activeTabId])

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

  // z-50: capture Escape, stop propagation so LorebookWorkspace (z-40) doesn't also close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', minWidth: '640px', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-ctp-surface1 shrink-0">
          <div className="flex items-center gap-1">
            <Tooltip
              text={backStack.length > 0
                ? `Back: ${entryMap.get(backStack[backStack.length - 1]) ?? '...'}`
                : 'No history'}
            >
              <button
                onClick={goBack}
                disabled={backStack.length === 0}
                className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
            </Tooltip>
            <Tooltip
              text={forwardStack.length > 0
                ? `Forward: ${entryMap.get(forwardStack[0]) ?? '...'}`
                : 'No forward history'}
            >
              <button
                onClick={goForward}
                disabled={forwardStack.length === 0}
                className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </Tooltip>
            {(['edit', 'health', 'simulator', 'keywords'] as EntryWorkspaceTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === t
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
              className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'edit' && (
            <EditorView
              scope="entry"
              activeFormat={activeFormat}
              entry={currentEntry}
              graph={graph}
              onEntryChange={handleEntryChange}
              connections={connections}
              onNavigate={navigate}
            />
          )}
          {activeTab === 'health' && (
            <div className="h-full overflow-y-auto">
              <HealthView
                scope="entry"
                entries={entries}
                graph={graph}
                entry={currentEntry}
                entryFindings={entryFindings}
                onEntrySelect={navigate}
                onEntryOpen={navigate}
              />
            </div>
          )}
          {activeTab === 'simulator' && (
            <div className="h-full overflow-hidden">
              <SimulatorView
                scope="entry"
                entries={entries}
                bookMeta={bookMeta}
                simulatorState={simulatorState}
                graph={graph}
                entry={currentEntry}
                onRunSimulation={handleRunSimulation}
                onUpdateSettings={handleUpdateSettings}
                onSetMessages={handleSetMessages}
                onEntrySelect={navigate}
                onEntryOpen={navigate}
              />
            </div>
          )}
          {activeTab === 'keywords' && (
            <div className="h-full overflow-hidden">
              <KeywordsView
                scope="entry"
                entries={entries}
                entry={currentEntry}
                activeFormat={activeFormat}
                onUpdateEntry={handleUpdateEntry}
                onEntrySelect={navigate}
                onEntryOpen={navigate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
