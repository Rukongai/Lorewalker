import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { modKey } from '@/lib/platform'
import { useStore } from 'zustand'
import { Upload, BookmarkPlus, Undo2, Redo2, Settings, ChevronLeft, ChevronRight, BarChart2, Scale, Zap, Github, Newspaper } from 'lucide-react'
import { TabBar } from './TabBar'
import { FilesPanel } from './FilesPanel'
import { SaveSnapshotDialog } from './SaveSnapshotDialog'
import { WhatsNewDialog } from './WhatsNewDialog'
import { LATEST_CHANGELOG_DATE } from '@/changelog'
import { WelcomeScreen } from './WelcomeScreen'
import { StatusBar } from './StatusBar'
import { LorebookPickerDialog } from './LorebookPickerDialog'
import type { LorebookMeta } from './LorebookPickerDialog'
import { KeywordNameDialog } from './KeywordNameDialog'
import type { WorkingEntry } from '@/types'
import { EntryList } from '@/components/entry-list/EntryList'
import { importFile, exportFileAs } from '@/services/file-service'
import { ExportButton } from './ExportButton'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE, useDerivedState } from '@/hooks/useDerivedState'
import { useAutosave } from '@/hooks/useAutosave'
import { useWorkspacePersistence } from '@/hooks/useWorkspacePersistence'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { saveSnapshot } from '@/services/persistence-service'
const GraphCanvas = lazy(() => import('@/components/graph/GraphCanvas').then(m => ({ default: m.GraphCanvas })))
const SettingsDialog = lazy(() => import('@/components/settings/SettingsDialog').then(m => ({ default: m.SettingsDialog })))
const EntryWorkspace = lazy(() => import('@/layouts/desktop/EntryWorkspace').then(m => ({ default: m.EntryWorkspace })))
const LorebookWorkspace = lazy(() => import('@/layouts/desktop/LorebookWorkspace').then(m => ({ default: m.LorebookWorkspace })))
import { SidebarPanel } from '@/layouts/desktop/SidebarPanel'
import { ToastStack } from '@/components/shared/ToastStack'
import type { UndoToast } from '@/components/shared/ToastStack'
import { describeStateChange } from '@/lib/undo-describe'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { PersistedDocument, PersistedSnapshot } from '@/types'
import { Tooltip } from '@/components/ui/Tooltip'
import { generateId } from '@/lib/uuid'
import { useWorkspaceInit } from './useWorkspaceInit'
import { useModalState } from './useModalState'

export function WorkspaceShell() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const activeTab = useWorkspaceStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const tabs = useWorkspaceStore((s) => s.tabs)
  const [isDragOver, setIsDragOver] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const dragStateRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null)
  const COLLAPSED_WIDTH = 28
  const [isResizing, setIsResizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    leftWidth, setLeftWidth,
    rightWidth, setRightWidth,
    leftCollapsed, setLeftCollapsed,
    rightCollapsed, setRightCollapsed,
    rightPanelTab, setRightPanelTab,
    leftPanelTab, setLeftPanelTab,
  } = useWorkspaceInit()

  const {
    modalEntryId, setModalEntryId,
    toolsModalOpen, setToolsModalOpen,
    toolsModalTab, setToolsModalTab,
    settingsOpen, setSettingsOpen,
    showSnapshotDialog, setShowSnapshotDialog,
    snapshotSaveCount, setSnapshotSaveCount,
  } = useModalState()

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

  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const lastSeenChangelogDate = useWorkspaceStore((s) => s.lastSeenChangelogDate)
  const setLastSeenChangelogDate = useWorkspaceStore((s) => s.setLastSeenChangelogDate)
  const hasUnreadChangelog = lastSeenChangelogDate === null || lastSeenChangelogDate < LATEST_CHANGELOG_DATE

  const [toasts, setToasts] = useState<UndoToast[]>([])

  // Autosave the active document to IndexedDB
  useAutosave(activeTabId)

  // Persist workspace settings (tabs, theme, panel layout) to IndexedDB
  const panelLayout = useMemo(() => ({
    leftPanelWidth: leftWidth,
    rightPanelWidth: rightWidth,
    leftCollapsed,
    rightCollapsed,
    rightPanelTab,
    leftPanelTab: leftPanelTab as 'files' | 'entries',
  }), [leftWidth, rightWidth, leftCollapsed, rightCollapsed, rightPanelTab, leftPanelTab])
  useWorkspacePersistence(panelLayout)

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
      initialFormat: doc.activeFormat ?? doc.fileMeta.originalFormat,
    })
    useWorkspaceStore.getState().openTab(doc.tabId, doc.fileMeta.fileName, doc.fileMeta)
  }

  useDerivedState(activeTabId)

  // Always call the store hook unconditionally (Rules of Hooks).
  // EMPTY_STORE is a stable fallback used when no document is open.
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const cardPayload = activeStore((s) => s.cardPayload)
  const selectedEntryId = activeStore((s) => s.selection.selectedEntryId)
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
    onOpenFile: () => fileInputRef.current?.click(),
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

          {/* What's New */}
          <Tooltip text="What's New" placement="below">
            <button
              onClick={() => setWhatsNewOpen(true)}
              className="relative p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <Newspaper size={16} />
              {hasUnreadChangelog && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-ctp-peach" />
              )}
            </button>
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
          <Tooltip text="Open Health panel" placement="below">
            <button
              onClick={() => { setToolsModalTab('health'); setToolsModalOpen(true) }}
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
          className="relative shrink-0 border-r border-ctp-surface1 bg-ctp-mantle flex flex-col overflow-hidden"
          style={{
            width: leftCollapsed ? COLLAPSED_WIDTH : leftWidth,
            transition: isResizing ? 'none' : 'width 200ms ease-in-out',
          }}
        >
          {leftCollapsed ? (
            <Tooltip text="Expand entries panel">
              <button
                className="absolute inset-0 flex items-center justify-center text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
                onClick={() => setLeftCollapsed(false)}
              >
                <ChevronRight size={18} />
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
                ? <FilesPanel onRestoreDoc={handleRestoreDoc} onFileOpened={() => setLeftPanelTab('entries')} snapshotSaveCount={snapshotSaveCount} />
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
          className="relative shrink-0 border-l border-ctp-surface1 bg-ctp-mantle flex flex-col overflow-hidden"
          style={{
            width: rightCollapsed ? COLLAPSED_WIDTH : rightWidth,
            transition: isResizing ? 'none' : 'width 200ms ease-in-out',
          }}
        >
          {rightCollapsed ? (
            <Tooltip text="Expand editor panel">
              <button
                className="absolute inset-0 flex items-center justify-center text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
                onClick={() => setRightCollapsed(false)}
              >
                <ChevronLeft size={18} />
              </button>
            </Tooltip>
          ) : (
            <SidebarPanel
              tab={rightPanelTab}
              onTabChange={setRightPanelTab}
              onCollapse={() => setRightCollapsed(true)}
              onOpenEntry={(id) => setModalEntryId(id)}
              onSelectEntry={(id) => realStore?.getState().selectEntry(id)}
            />
          )}
        </aside>
      </div>

      {/* Status bar */}
      <StatusBar activeTabId={activeTabId} fileName={activeTab?.fileMeta.fileName} />

      {modalEntryId && (
        <Suspense fallback={null}>
          <EntryWorkspace
            entryId={modalEntryId}
            onClose={() => setModalEntryId(null)}
          />
        </Suspense>
      )}
      {toolsModalOpen && (
        <Suspense fallback={null}>
          <LorebookWorkspace
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

      <WhatsNewDialog
        open={whatsNewOpen}
        lastSeenDate={lastSeenChangelogDate}
        onClose={() => {
          setLastSeenChangelogDate(LATEST_CHANGELOG_DATE)
          setWhatsNewOpen(false)
        }}
      />

      <ToastStack toasts={toasts} />
    </div>
  )
}
