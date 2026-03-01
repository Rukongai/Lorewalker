import { useCallback, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { Upload, Save, Undo2, Redo2, Settings, ChevronLeft, ChevronRight, ChevronDown, Maximize2 } from 'lucide-react'
import { TabBar } from './TabBar'
import { EntryList } from '@/components/entry-list/EntryList'
import { EntryEditor } from '@/components/editor/EntryEditor'
import { importFile, exportFile } from '@/services/file-service'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { GraphCanvas } from '@/components/graph/GraphCanvas'
import { BookMetaEditor } from '@/components/editor/BookMetaEditor'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { EntryEditorModal } from '@/components/editor/EntryEditorModal'
import { Toggle } from '@/components/shared/Toggle'

export function WorkspaceShell() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const activeTab = useWorkspaceStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const [isDragOver, setIsDragOver] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [leftWidth, setLeftWidth] = useState(256)
  const [rightWidth, setRightWidth] = useState(320)
  const dragStateRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null)
  const COLLAPSED_WIDTH = 28
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [lorebookSettingsOpen, setLorebookSettingsOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(true)
  const [editorModalOpen, setEditorModalOpen] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false)

  // Always call the store hook unconditionally (Rules of Hooks).
  // EMPTY_STORE is a stable fallback used when no document is open.
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
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

  const handleImportFile = useCallback(async (file: File) => {
    setImportError(null)
    try {
      await importFile(file)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }, [])

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

  function handleSave() {
    if (!activeTabId || !activeTab) return
    exportFile(activeTabId, activeTab.fileMeta.fileName)
  }

  function handleToggleEnabled() {
    if (!realStore || !selectedEntry) return
    realStore.getState().updateEntry(selectedEntry.id, { enabled: !selectedEntry.enabled })
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }

  function handleUndo() {
    realStore?.temporal.getState().undo()
  }

  function handleRedo() {
    realStore?.temporal.getState().redo()
  }

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
          <span className="text-lg font-semibold text-ctp-lavender">Lorewalker</span>
          {activeTab && (
            <span className="text-xs text-ctp-overlay0">{activeTab.fileMeta.fileName}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 disabled:opacity-50 transition-colors"
          >
            <Undo2 size={16} />
          </button>

          {/* Redo */}
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo"
            className="p-1.5 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 disabled:opacity-50 transition-colors"
          >
            <Redo2 size={16} />
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!activeTabId}
            title="Save (Ctrl+S)"
            className="p-1.5 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
          </button>

          {/* Open file */}
          <label
            title="Open file"
            className="p-1.5 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 cursor-pointer transition-colors"
          >
            <Upload size={16} />
            <input
              type="file"
              accept=".json,.png,.charx"
              onChange={handleFilePickerChange}
              className="sr-only"
            />
          </label>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className="p-1.5 rounded text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
          >
            <Settings size={16} />
          </button>
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
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-ctp-lavender/15 border-2 border-dashed border-ctp-lavender">
            <p className="text-lg font-medium text-ctp-lavender">Drop lorebook to open</p>
          </div>
        )}

        {/* Left panel: entry list */}
        <aside
          className="shrink-0 border-r border-ctp-surface0 bg-ctp-base flex flex-col overflow-hidden"
          style={{
            width: leftCollapsed ? COLLAPSED_WIDTH : leftWidth,
            transition: isResizing ? 'none' : 'width 200ms ease-in-out',
          }}
        >
          {leftCollapsed ? (
            <button
              className="flex-1 flex items-center justify-center text-ctp-overlay0 hover:text-ctp-subtext0 hover:bg-ctp-surface0 transition-colors"
              onClick={() => setLeftCollapsed(false)}
              title="Expand entries panel"
            >
              <ChevronRight size={14} />
            </button>
          ) : (
            <>
              <div className="p-3 border-b border-ctp-surface0 shrink-0 flex items-center justify-between">
                <span className="text-xs font-medium text-ctp-overlay1 uppercase tracking-wider">Entries</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLeftCollapsed(true)}
                    title="Collapse panel"
                    className="p-1 rounded text-ctp-overlay0 hover:text-ctp-subtext0 hover:bg-ctp-surface0 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>
              <EntryList />
            </>
          )}
        </aside>

        {/* Drag divider: left ↔ center */}
        {!leftCollapsed && (
          <div
            className="w-1 shrink-0 cursor-col-resize bg-ctp-surface0 hover:bg-ctp-lavender transition-colors"
            onMouseDown={(e) => startDrag(e, 'left')}
          />
        )}

        {/* Center panel: graph canvas */}
        <main className="flex-1 bg-ctp-base flex overflow-hidden">
          {!activeTabId ? (
            <div className="flex-1 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-3">
                <div className="text-5xl text-ctp-surface1">&#x2B21;</div>
                <p className="text-sm text-ctp-overlay0">Drag a SillyTavern JSON file here</p>
                <p className="text-xs text-ctp-overlay0">or click the upload icon above</p>
              </div>
            </div>
          ) : (
            <GraphCanvas
              tabId={activeTabId}
              onNodeDoubleClick={() => setEditorModalOpen(true)}
              onAddEntry={() => setEditorModalOpen(true)}
            />
          )}
        </main>

        {/* Drag divider: center ↔ right */}
        {!rightCollapsed && (
          <div
            className="w-1 shrink-0 cursor-col-resize bg-ctp-surface0 hover:bg-ctp-lavender transition-colors"
            onMouseDown={(e) => startDrag(e, 'right')}
          />
        )}

        {/* Right panel: entry editor */}
        <aside
          className="shrink-0 border-l border-ctp-surface0 bg-ctp-base flex flex-col overflow-hidden"
          style={{
            width: rightCollapsed ? COLLAPSED_WIDTH : rightWidth,
            transition: isResizing ? 'none' : 'width 200ms ease-in-out',
          }}
        >
          {rightCollapsed ? (
            <button
              className="flex-1 flex items-center justify-center text-ctp-overlay0 hover:text-ctp-subtext0 hover:bg-ctp-surface0 transition-colors"
              onClick={() => setRightCollapsed(false)}
              title="Expand editor panel"
            >
              <ChevronLeft size={14} />
            </button>
          ) : (
            <>
              <div className="p-3 border-b border-ctp-surface0 shrink-0 flex items-center justify-between">
                <span className="text-xs font-medium text-ctp-overlay1 uppercase tracking-wider">
                  Entry
                </span>
                <button
                  onClick={() => setRightCollapsed(true)}
                  title="Collapse panel"
                  className="p-1 rounded text-ctp-overlay0 hover:text-ctp-subtext0 hover:bg-ctp-surface0 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Lorebook Settings section — always shown when a book is open */}
              {activeTabId && (
                <div className="border-b border-ctp-surface0 shrink-0">
                  <button
                    onClick={() => setLorebookSettingsOpen(o => !o)}
                    className="w-full px-3 py-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay0 hover:text-ctp-overlay1 transition-colors"
                  >
                    {lorebookSettingsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    Lorebook
                  </button>
                  {lorebookSettingsOpen && <BookMetaEditor />}
                </div>
              )}

              {/* Editor section */}
              <div className="flex flex-col flex-1 overflow-hidden">
                {activeTabId && (
                  <div className="flex items-center border-b border-ctp-surface0 shrink-0">
                    <div
                      onClick={() => setEditorOpen(o => !o)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditorOpen(o => !o) }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={editorOpen}
                      className={`flex-1 px-3 py-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-ctp-overlay0 hover:text-ctp-overlay1 transition-colors cursor-default ${selectedEntry ? '' : 'uppercase'}`}
                    >
                      {editorOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      <span className="truncate">{selectedEntry ? (selectedEntry.name || 'Untitled') : 'Entry'}</span>
                      {selectedEntry && (
                        <span onClick={(e) => e.stopPropagation()} className="ml-1">
                          <Toggle
                            checked={selectedEntry.enabled}
                            onChange={handleToggleEnabled}
                            aria-label={selectedEntry.enabled ? 'Disable entry' : 'Enable entry'}
                          />
                        </span>
                      )}
                    </div>
                    {selectedEntryId && (
                      <button
                        onClick={() => setEditorModalOpen(true)}
                        title="Open in full editor"
                        className="p-1.5 mr-2 rounded text-ctp-overlay0 hover:text-ctp-subtext0 hover:bg-ctp-surface0 transition-colors"
                      >
                        <Maximize2 size={12} />
                      </button>
                    )}
                  </div>
                )}
                {editorOpen && (
                  selectedEntryId ? (
                    <EntryEditor entryId={selectedEntryId} />
                  ) : activeTabId ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs text-ctp-overlay0">Select an entry to edit</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs text-ctp-overlay0">No file open</p>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {editorModalOpen && selectedEntryId && (
        <EntryEditorModal
          entryId={selectedEntryId}
          onClose={() => setEditorModalOpen(false)}
        />
      )}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
