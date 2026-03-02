import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { modKey } from '@/lib/platform'
import { useStore } from 'zustand'
import { Upload, BookmarkPlus, Undo2, Redo2, Settings, ChevronLeft, ChevronRight, Maximize2, BarChart2, Scale, Zap, Github } from 'lucide-react'
import { TabBar } from './TabBar'
import { FilesPanel } from './FilesPanel'
import { SaveSnapshotDialog } from './SaveSnapshotDialog'
import { WelcomeScreen } from './WelcomeScreen'
import { StatusBar } from './StatusBar'
import { LorebookPickerDialog } from './LorebookPickerDialog'
import type { LorebookMeta } from './LorebookPickerDialog'
import { KeywordNameDialog } from './KeywordNameDialog'
import type { WorkingEntry } from '@/types'
import { EntryList } from '@/components/entry-list/EntryList'
const EntryEditor = lazy(() => import('@/components/editor/EntryEditor').then(m => ({ default: m.EntryEditor })))
import { importFile, exportFileAs } from '@/services/file-service'
import { ExportButton } from './ExportButton'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE, useDerivedState } from '@/hooks/useDerivedState'
import { useAutosave } from '@/hooks/useAutosave'
import { useWorkspacePersistence } from '@/hooks/useWorkspacePersistence'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { loadWorkspace, loadPreferences, cleanupStaleDocuments, loadProviders, saveSnapshot } from '@/services/persistence-service'
import { llmService } from '@/services/llm/llm-service'
import { OpenAICompatibleProvider } from '@/services/llm/providers/openai-compatible'
import { AnthropicProvider } from '@/services/llm/providers/anthropic'
const GraphCanvas = lazy(() => import('@/components/graph/GraphCanvas').then(m => ({ default: m.GraphCanvas })))
const SettingsDialog = lazy(() => import('@/components/settings/SettingsDialog').then(m => ({ default: m.SettingsDialog })))
const EntryEditorModal = lazy(() => import('@/components/editor/EntryEditorModal').then(m => ({ default: m.EntryEditorModal })))
import { BookMetaEditor } from '@/components/editor/BookMetaEditor'
import { Toggle } from '@/components/shared/Toggle'
import { ToastStack } from '@/components/shared/ToastStack'
import type { UndoToast } from '@/components/shared/ToastStack'
import { describeStateChange } from '@/lib/undo-describe'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'
import { InspectorPanel } from '@/components/analysis/InspectorPanel'
import { SimulatorPanel } from '@/components/simulator/SimulatorPanel'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
const WorkspaceToolsModal = lazy(() => import('@/components/tools-modal/WorkspaceToolsModal').then(m => ({ default: m.WorkspaceToolsModal })))
import type { ToolsTab } from '@/components/tools-modal/WorkspaceToolsModal'
import type { PersistedDocument, PersistedSnapshot } from '@/types'
import { Tooltip } from '@/components/ui/Tooltip'
import { generateId } from '@/lib/uuid'

type RightPanelTab = 'lorebook' | 'entry' | 'analysis' | 'inspector' | 'simulator'
type LeftPanelTab = 'files' | 'entries'

const DEFAULT_PREFERENCES = { autosaveIntervalMs: 2000, recoveryRetentionDays: 7, simulationDefaults: { defaultScanDepth: 4, defaultTokenBudget: 50000, defaultCaseSensitive: false, defaultMatchWholeWords: false, defaultMaxRecursionSteps: 0, defaultIncludeNames: false } }

export function WorkspaceShell() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const activeTab = useWorkspaceStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const tabs = useWorkspaceStore((s) => s.tabs)
  const [isDragOver, setIsDragOver] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [leftWidth, setLeftWidth] = useState(256)
  const [rightWidth, setRightWidth] = useState(320)
  const dragStateRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null)
  const COLLAPSED_WIDTH = 28
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [modalEntryId, setModalEntryId] = useState<string | null>(null)
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('entries')
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false)
  const [snapshotSaveCount, setSnapshotSaveCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lorebook picker dialog state
  const [lorebookPickerState, setLorebookPickerState] = useState<{
    lorebooks: LorebookMeta[]
    resolve: (indices: number[]) => void
    reject: () => void
  } | null>(null)

  // Keyword name dialog state
  const [keywordNameState, setKeywordNameState] = useState<{
    entries: WorkingEntry[]
    resolve: (value: boolean) => void
  } | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toolsModalOpen, setToolsModalOpen] = useState(false)
  const [toolsModalTab, setToolsModalTab] = useState<ToolsTab>('analysis')
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('entry')
  const [toasts, setToasts] = useState<UndoToast[]>([])

  // Autosave the active document to IndexedDB
  useAutosave(activeTabId)

  // Persist workspace settings (tabs, theme, panel layout) to IndexedDB
  const panelLayout = useMemo(() => ({
    leftPanelWidth: leftWidth,
    rightPanelWidth: rightWidth,
    leftCollapsed,
    rightCollapsed,
    rightPanelTab: rightPanelTab as 'lorebook' | 'entry' | 'analysis' | 'inspector' | 'simulator',
    leftPanelTab: leftPanelTab as 'files' | 'entries',
  }), [leftWidth, rightWidth, leftCollapsed, rightCollapsed, rightPanelTab, leftPanelTab])
  useWorkspacePersistence(panelLayout)

  // On mount: restore persisted state and check for recovery docs
  useEffect(() => {
    async function init() {
      // Bootstrap LLMService from IndexedDB
      try {
        const persistedProviders = await loadProviders()
        for (const p of persistedProviders) {
          const config = { ...p.config, apiKey: p.apiKey }
          const provider = p.type === 'anthropic'
            ? new AnthropicProvider(p.id, p.name, config)
            : new OpenAICompatibleProvider(p.id, p.name, config)
          llmService.registerProvider(provider)
        }
        if (persistedProviders.length > 0) {
          const firstId = persistedProviders[0].id
          if (!useWorkspaceStore.getState().activeLlmProviderId) {
            useWorkspaceStore.getState().setActiveLlmProviderId(firstId)
          }
        }
      } catch {
        // Non-fatal — app works without LLM
      }

      const prefs = await loadPreferences() ?? DEFAULT_PREFERENCES
      const workspace = await loadWorkspace()
      if (workspace) {
        useWorkspaceStore.getState().setTheme(workspace.theme)
        setLeftWidth(workspace.panelLayout.leftPanelWidth)
        setRightWidth(workspace.panelLayout.rightPanelWidth)
        setLeftCollapsed(workspace.panelLayout.leftCollapsed)
        setRightCollapsed(workspace.panelLayout.rightCollapsed)
        setRightPanelTab(workspace.panelLayout.rightPanelTab as RightPanelTab)
        setLeftPanelTab(workspace.panelLayout.leftPanelTab ?? 'entries')
      }
      await cleanupStaleDocuments(prefs.recoveryRetentionDays)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before unload if any tabs have unsaved changes
  useEffect(() => {
    const hasDirtyTabs = tabs.some((t) => t.dirty)
    if (!hasDirtyTabs) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [tabs])

  function handleRestoreDoc(doc: PersistedDocument) {
    const positions = new Map(Object.entries(doc.graphPositions))
    documentStoreRegistry.create(doc.tabId, {
      entries: doc.entries,
      bookMeta: doc.bookMeta,
      graphPositions: positions,
      simulatorState: doc.simulatorState,
      ruleOverrides: doc.ruleOverrides,
      cardPayload: doc.cardPayload ?? null,
    })
    useWorkspaceStore.getState().openTab(doc.tabId, doc.fileMeta.fileName, doc.fileMeta)
  }

  const { graph } = useDerivedState(activeTabId)

  // Always call the store hook unconditionally (Rules of Hooks).
  // EMPTY_STORE is a stable fallback used when no document is open.
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const cardPayload = activeStore((s) => s.cardPayload)
  const selectedEntryId = activeStore((s) => s.selection.selectedEntryId)
  const selectedEntry = activeStore((s) => {
    const id = s.selection.selectedEntryId
    if (!id) return null
    return s.entries.find((e) => e.id === id) ?? null
  })
  // Reactively subscribe to temporal state using useStore (temporal is a vanilla Zustand store)
  const temporalStore = realStore?.temporal ?? EMPTY_STORE.temporal
  const canUndo = useStore(temporalStore, s => s.pastStates.length > 0)
  const canRedo = useStore(temporalStore, s => s.futureStates.length > 0)

  // Lorebook picker callback for multi-lorebook card imports
  const onLorebookPick = useCallback((lorebooks: LorebookMeta[]): Promise<number[]> => {
    return new Promise((resolve, reject) => {
      setLorebookPickerState({
        lorebooks,
        resolve,
        reject,
      })
    })
  }, [])

  const onKeywordName = useCallback((entries: WorkingEntry[]): Promise<boolean> => {
    return new Promise((resolve) => {
      setKeywordNameState({ entries, resolve })
    })
  }, [])

  const handleImportFile = useCallback(async (file: File) => {
    setImportError(null)
    try {
      await importFile(file, onLorebookPick, onKeywordName)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }, [onLorebookPick, onKeywordName])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) await handleImportFile(file)
    },
    [handleImportFile]
  )

  const handleFilePickerChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) await handleImportFile(file)
      // Reset input so the same file can be re-opened
      e.target.value = ''
    },
    [handleImportFile]
  )

  const handleExport = useCallback(async (format: 'json' | 'png' | 'charx') => {
    if (!activeTabId || !activeTab) return
    try {
      await exportFileAs(activeTabId, format, activeTab.fileMeta.fileName)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Export failed')
    }
  }, [activeTabId, activeTab])

  function handleToggleEnabled() {
    if (!realStore || !selectedEntry) return
    realStore.getState().updateEntry(selectedEntry.id, { enabled: !selectedEntry.enabled })
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }

  const addToast = useCallback((message: string, type: 'undo' | 'redo') => {
    const id = generateId()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const handleUndo = useCallback(() => {
    if (!realStore) return
    const temporal = realStore.temporal.getState()
    if (temporal.pastStates.length === 0) return
    const restoredState = temporal.pastStates[temporal.pastStates.length - 1]
    const currentState = { entries: realStore.getState().entries, bookMeta: realStore.getState().bookMeta }
    temporal.undo()
    const msg = describeStateChange(currentState, restoredState as typeof currentState)
    addToast(`Undid: ${msg}`, 'undo')
  }, [realStore, addToast])

  const handleRedo = useCallback(() => {
    if (!realStore) return
    const temporal = realStore.temporal.getState()
    if (temporal.futureStates.length === 0) return
    const restoredState = temporal.futureStates[temporal.futureStates.length - 1]
    const currentState = { entries: realStore.getState().entries, bookMeta: realStore.getState().bookMeta }
    temporal.redo()
    const msg = describeStateChange(currentState, restoredState as typeof currentState)
    addToast(`Redid: ${msg}`, 'redo')
  }, [realStore, addToast])

  const handleNewEntry = useCallback(() => {
    if (!realStore) return
    const id = realStore.getState().addEntry()
    realStore.getState().selectEntry(id)
    setModalEntryId(id)
  }, [realStore])

  const handleClearSelection = useCallback(() => {
    realStore?.getState().clearSelection()
  }, [realStore])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    activeTabId,
    onSave: () => setShowSnapshotDialog(true),
    onUndo: handleUndo,
    onRedo: handleRedo,
    onNewEntry: handleNewEntry,
    onClearSelection: handleClearSelection,
  })

  const startDrag = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    if (side === 'left' && leftCollapsed) return
    if (side === 'right' && rightCollapsed) return
    e.preventDefault()
    dragStateRef.current = {
      side,
      startX: e.clientX,
      startWidth: side === 'left' ? leftWidth : rightWidth,
    }
    setIsResizing(true)
    const onMouseMove = (ev: MouseEvent) => {
      const state = dragStateRef.current
      if (!state) return
      const delta = ev.clientX - state.startX
      const rawWidth = state.startWidth + (state.side === 'left' ? delta : -delta)
      const clamped = Math.min(600, Math.max(160, rawWidth))
      if (state.side === 'left') setLeftWidth(clamped)
      else setRightWidth(clamped)
    }
    const onMouseUp = () => {
      dragStateRef.current = null
      setIsResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [leftWidth, rightWidth, leftCollapsed, rightCollapsed])

  return (
    <div
      className="flex flex-col h-screen w-screen bg-ctp-base text-ctp-text"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-ctp-mantle border-b border-ctp-surface0 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/lorewalker.svg" alt="Lorewalker" className="h-9 w-9" />
          <span className="text-lg font-semibold text-ctp-accent">Lorewalker</span>
          {activeTab && (
            <span className="text-xs text-ctp-overlay1">{activeTab.fileMeta.fileName}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* GitHub Issue Link */}
          <Tooltip text="Open an Issue" placement="below">
            <a
              href="https://github.com/Rukongai/Lorewalker/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <Github size={16} />
            </a>
          </Tooltip>
          <div className="w-px h-4 bg-ctp-surface1 mx-0.5" />
          {/* Undo */}
          <Tooltip text={`Undo (${modKey}+Z)`} placement="below">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-40 transition-colors"
            >
              <Undo2 size={16} />
            </button>
          </Tooltip>

          {/* Redo */}
          <Tooltip text={`Redo (${modKey}+Shift+Z)`} placement="below">
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-40 transition-colors"
            >
              <Redo2 size={16} />
            </button>
          </Tooltip>

          {/* Export */}
          <ExportButton
            tabId={activeTabId}
            fileMeta={activeTab?.fileMeta ?? null}
            cardPayload={cardPayload}
            onExport={handleExport}
          />

          {/* Open file */}
          <Tooltip text={`Open file (${modKey}+O)`} placement="below">
            <label className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 cursor-pointer transition-colors">
              <Upload size={16} />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.png,.charx"
                onChange={handleFilePickerChange}
                className="sr-only"
                data-1p-ignore
              />
            </label>
          </Tooltip>

          {/* Save snapshot */}
          <Tooltip text={`Save snapshot (${modKey}+S)`} placement="below">
            <button
              onClick={() => setShowSnapshotDialog(true)}
              disabled={!activeTabId}
              className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-40 transition-colors"
            >
              <BookmarkPlus size={16} />
            </button>
          </Tooltip>

          {/* Settings */}
          <Tooltip text="Settings" placement="below">
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <Settings size={16} />
            </button>
          </Tooltip>

          <div className="w-px h-4 bg-ctp-surface1 mx-0.5" />

          {/* Analysis tools modal */}
          <Tooltip text="Open Analysis panel" placement="below">
            <button
              onClick={() => { setToolsModalTab('analysis'); setToolsModalOpen(true) }}
              disabled={!activeTabId}
              className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-40 transition-colors"
            >
              <BarChart2 size={16} />
            </button>
          </Tooltip>

          {/* Simulator tools modal */}
          <Tooltip text="Open Simulator panel" placement="below">
            <button
              onClick={() => { setToolsModalTab('simulator'); setToolsModalOpen(true) }}
              disabled={!activeTabId}
              className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-40 transition-colors"
            >
              <Zap size={16} />
            </button>
          </Tooltip>

          {/* Rules tools modal */}
          <Tooltip text="Open Rules panel" placement="below">
            <button
              onClick={() => { setToolsModalTab('rules'); setToolsModalOpen(true) }}
              disabled={!activeTabId}
              className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-40 transition-colors"
            >
              <Scale size={16} />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Tab bar */}
      <TabBar />

      {/* Error banner */}
      {importError && (
        <div className="px-4 py-2 bg-ctp-red/15 border-b border-ctp-red/40 text-xs text-ctp-red flex items-center justify-between">
          <span>{importError}</span>
          <button onClick={() => setImportError(null)} className="text-ctp-red hover:text-ctp-maroon ml-4">✕</button>
        </div>
      )}

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-ctp-accent/15 border-2 border-dashed border-ctp-accent">
            <p className="text-lg font-medium text-ctp-accent">Drop lorebook to open</p>
          </div>
        )}

        {/* Left panel: entry list */}
        <aside
          className="shrink-0 border-r border-ctp-surface1 bg-ctp-mantle flex flex-col overflow-hidden"
          style={{
            width: leftCollapsed ? COLLAPSED_WIDTH : leftWidth,
            transition: isResizing ? 'none' : 'width 200ms ease-in-out',
          }}
        >
          {leftCollapsed ? (
            <Tooltip text="Expand entries panel">
              <button
                className="flex-1 flex items-center justify-center text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
                onClick={() => setLeftCollapsed(false)}
              >
                <ChevronRight size={14} />
              </button>
            </Tooltip>
          ) : (
            <>
              {/* Left panel tab switcher */}
              <div className="flex border-b border-ctp-surface0 shrink-0 items-center">
                <div className="flex flex-1">
                  {(['files', 'entries'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLeftPanelTab(tab)}
                      className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors border-b-2 ${
                        leftPanelTab === tab
                          ? 'text-ctp-text border-ctp-accent'
                          : 'text-ctp-overlay1 border-transparent hover:text-ctp-subtext1'
                      }`}
                    >
                      {tab === 'files' ? 'Files' : 'Entries'}
                    </button>
                  ))}
                </div>
                <Tooltip text="Collapse panel">
                  <button
                    onClick={() => setLeftCollapsed(true)}
                    className="p-1 mx-1 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </Tooltip>
              </div>

              {/* Left panel content */}
              {leftPanelTab === 'files'
                ? <FilesPanel onRestoreDoc={handleRestoreDoc} snapshotSaveCount={snapshotSaveCount} />
                : <EntryList onOpenModal={setModalEntryId} />
              }
            </>
          )}
        </aside>

        {/* Drag divider: left ↔ center */}
        {!leftCollapsed && (
          <div
            className="w-1 shrink-0 cursor-col-resize bg-ctp-surface1 hover:bg-ctp-accent transition-colors"
            onMouseDown={(e) => startDrag(e, 'left')}
          />
        )}

        {/* Center panel: graph canvas */}
        <main className="flex-1 bg-ctp-base flex overflow-hidden">
          {!activeTabId ? (
            <WelcomeScreen onOpenFile={() => fileInputRef.current?.click()} />
          ) : (
            <Suspense fallback={null}>
              <ErrorBoundary label="Graph">
                <GraphCanvas
                  key={activeTabId}
                  tabId={activeTabId}
                  onNodeDoubleClick={() => { if (selectedEntryId) setModalEntryId(selectedEntryId) }}
                  onAddEntry={() => {
                    const id = realStore?.getState().selection.selectedEntryId
                    if (id) setModalEntryId(id)
                  }}
                  isModalOpen={modalEntryId !== null}
                />
              </ErrorBoundary>
            </Suspense>
          )}
        </main>

        {/* Drag divider: center ↔ right */}
        {!rightCollapsed && (
          <div
            className="w-1 shrink-0 cursor-col-resize bg-ctp-surface1 hover:bg-ctp-accent transition-colors"
            onMouseDown={(e) => startDrag(e, 'right')}
          />
        )}

        {/* Right panel: entry editor */}
        <aside
          className="shrink-0 border-l border-ctp-surface1 bg-ctp-mantle flex flex-col overflow-hidden"
          style={{
            width: rightCollapsed ? COLLAPSED_WIDTH : rightWidth,
            transition: isResizing ? 'none' : 'width 200ms ease-in-out',
          }}
        >
          {rightCollapsed ? (
            <Tooltip text="Expand editor panel">
              <button
                className="flex-1 flex items-center justify-center text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
                onClick={() => setRightCollapsed(false)}
              >
                <ChevronLeft size={14} />
              </button>
            </Tooltip>
          ) : (
            <>
              {/* Panel header with tabs */}
              <div className="border-b border-ctp-surface0 shrink-0 flex flex-wrap items-center px-1">
                <div className="flex flex-wrap flex-1">
                  {(['lorebook', 'entry', 'analysis', 'inspector', 'simulator'] as RightPanelTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRightPanelTab(tab)}
                      className={`px-2.5 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors border-b-2 ${
                        rightPanelTab === tab
                          ? 'text-ctp-accent border-ctp-accent'
                          : 'text-ctp-overlay1 border-transparent hover:text-ctp-subtext1'
                      }`}
                    >
                      {tab === 'lorebook' ? 'Lorebook'
                        : tab === 'entry' ? 'Entry'
                        : tab === 'analysis' ? 'Analysis'
                        : tab === 'inspector' ? 'Inspection'
                        : 'Simulator'}
                    </button>
                  ))}
                </div>
                <Tooltip text="Collapse panel">
                  <button
                    onClick={() => setRightCollapsed(true)}
                    className="p-1 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </Tooltip>
              </div>

              {/* Tab: Lorebook */}
              {rightPanelTab === 'lorebook' && (
                <div className="flex flex-col flex-1 overflow-y-auto">
                  {activeTabId ? (
                    <BookMetaEditor />
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs text-ctp-overlay1">No file open</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Entry */}
              {rightPanelTab === 'entry' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {activeTabId && selectedEntry && (
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
                          onClick={() => setModalEntryId(selectedEntryId!)}
                          className="p-1 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
                        >
                          <Maximize2 size={12} />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                  {selectedEntryId ? (
                    <Suspense fallback={null}>
                      <ErrorBoundary label="Editor">
                        <EntryEditor entryId={selectedEntryId} />
                      </ErrorBoundary>
                    </Suspense>
                  ) : activeTabId ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs text-ctp-overlay1">Select an entry to edit</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs text-ctp-overlay1">No file open</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Analysis */}
              {rightPanelTab === 'analysis' && (
                <ErrorBoundary label="Analysis">
                  <AnalysisPanel tabId={activeTabId} graph={graph} />
                </ErrorBoundary>
              )}

              {/* Tab: Inspector */}
              {rightPanelTab === 'inspector' && (
                <InspectorPanel tabId={activeTabId} graph={graph} />
              )}

              {/* Tab: Simulator */}
              {rightPanelTab === 'simulator' && (
                <ErrorBoundary label="Simulator">
                  <SimulatorPanel tabId={activeTabId} />
                </ErrorBoundary>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Status bar */}
      <StatusBar activeTabId={activeTabId} fileName={activeTab?.fileMeta.fileName} />

      {modalEntryId && (
        <Suspense fallback={null}>
          <EntryEditorModal
            entryId={modalEntryId}
            onClose={() => setModalEntryId(null)}
          />
        </Suspense>
      )}
      {toolsModalOpen && (
        <Suspense fallback={null}>
          <WorkspaceToolsModal
            tab={toolsModalTab}
            onTabChange={setToolsModalTab}
            onClose={() => setToolsModalOpen(false)}
            onOpenEntry={(entryId) => setModalEntryId(entryId)}
            onSelectEntry={(entryId) => {
              setToolsModalOpen(false)
              realStore?.getState().selectEntry(entryId)
            }}
          />
        </Suspense>
      )}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsDialog open onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
      <SaveSnapshotDialog
        open={showSnapshotDialog}
        defaultName={`${activeTab?.fileMeta.fileName ?? 'snapshot'} — ${new Date().toLocaleString()}`}
        onSave={async (name) => {
          if (!activeTabId || !realStore) return
          const state = realStore.getState()
          const snapshot: PersistedSnapshot = {
            id: generateId(),
            tabId: activeTabId,
            name,
            savedAt: new Date().toISOString(),
            entries: state.entries,
            bookMeta: state.bookMeta,
          }
          await saveSnapshot(snapshot)
          setSnapshotSaveCount((c) => c + 1)
          setShowSnapshotDialog(false)
        }}
        onCancel={() => setShowSnapshotDialog(false)}
      />

      {/* Lorebook picker dialog */}
      {lorebookPickerState && (
        <LorebookPickerDialog
          cardName={activeTab?.fileMeta.fileName ?? 'Character card'}
          lorebooks={lorebookPickerState.lorebooks}
          onSelect={(indices) => {
            lorebookPickerState.resolve(indices)
            setLorebookPickerState(null)
          }}
          onCancel={() => {
            lorebookPickerState.reject()
            setLorebookPickerState(null)
          }}
        />
      )}

      {/* Keyword name dialog */}
      {keywordNameState && (
        <KeywordNameDialog
          entries={keywordNameState.entries}
          onConfirm={() => {
            keywordNameState.resolve(true)
            setKeywordNameState(null)
          }}
          onCancel={() => {
            keywordNameState.resolve(false)
            setKeywordNameState(null)
          }}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  )
}
