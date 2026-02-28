import { useCallback, useRef, useState } from 'react'
import { Upload, Save, Undo2, Redo2 } from 'lucide-react'
import { TabBar } from './TabBar'
import { EntryList } from '@/components/entry-list/EntryList'
import { EntryEditor } from '@/components/editor/EntryEditor'
import { importFile, exportFile } from '@/services/file-service'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { GraphCanvas } from '@/components/graph/GraphCanvas'

export function WorkspaceShell() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const activeTab = useWorkspaceStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const [isDragOver, setIsDragOver] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [leftWidth, setLeftWidth] = useState(256)
  const [rightWidth, setRightWidth] = useState(320)
  const dragStateRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null)

  // Always call the store hook unconditionally (Rules of Hooks).
  // EMPTY_STORE is a stable fallback used when no document is open.
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const selectedEntryId = activeStore((s) => s.selection.selectedEntryId)
  // zundo exposes temporal state on the store instance (not via state selector)
  const temporalState = realStore?.temporal.getState()
  const canUndo = (temporalState?.pastStates.length ?? 0) > 0
  const canRedo = (temporalState?.futureStates.length ?? 0) > 0

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

  function handleUndo() {
    realStore?.temporal.getState().undo()
  }

  function handleRedo() {
    realStore?.temporal.getState().redo()
  }

  const startDrag = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault()
    dragStateRef.current = {
      side,
      startX: e.clientX,
      startWidth: side === 'left' ? leftWidth : rightWidth,
    }
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
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [leftWidth, rightWidth])

  return (
    <div
      className="flex flex-col h-screen w-screen bg-gray-950 text-gray-100"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-indigo-400">Lorewalker</span>
          {activeTab && (
            <span className="text-xs text-gray-500">{activeTab.fileMeta.fileName}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <Undo2 size={16} />
          </button>

          {/* Redo */}
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo"
            className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <Redo2 size={16} />
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!activeTabId}
            title="Save (Ctrl+S)"
            className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <Save size={16} />
          </button>

          {/* Open file */}
          <label
            title="Open file"
            className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <Upload size={16} />
            <input
              type="file"
              accept=".json,.png,.charx"
              onChange={handleFilePickerChange}
              className="sr-only"
            />
          </label>
        </div>
      </header>

      {/* Tab bar */}
      <TabBar />

      {/* Error banner */}
      {importError && (
        <div className="px-4 py-2 bg-red-900/40 border-b border-red-800 text-xs text-red-300 flex items-center justify-between">
          <span>{importError}</span>
          <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-900/40 border-2 border-dashed border-indigo-400">
            <p className="text-lg font-medium text-indigo-300">Drop lorebook to open</p>
          </div>
        )}

        {/* Left panel: entry list */}
        <aside
          className="shrink-0 border-r border-gray-800 bg-gray-950 flex flex-col overflow-hidden"
          style={{ width: leftWidth }}
        >
          <div className="p-3 border-b border-gray-800 shrink-0">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Entries</span>
          </div>
          <EntryList />
        </aside>

        {/* Drag divider: left ↔ center */}
        <div
          className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-600 transition-colors"
          onMouseDown={(e) => startDrag(e, 'left')}
        />

        {/* Center panel: graph canvas */}
        <main className="flex-1 bg-gray-950 flex overflow-hidden">
          {!activeTabId ? (
            <div className="flex-1 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-3">
                <div className="text-5xl text-gray-700">&#x2B21;</div>
                <p className="text-sm text-gray-500">Drag a SillyTavern JSON file here</p>
                <p className="text-xs text-gray-600">or click the upload icon above</p>
              </div>
            </div>
          ) : (
            <GraphCanvas tabId={activeTabId} />
          )}
        </main>

        {/* Drag divider: center ↔ right */}
        <div
          className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-600 transition-colors"
          onMouseDown={(e) => startDrag(e, 'right')}
        />

        {/* Right panel: entry editor */}
        <aside
          className="shrink-0 border-l border-gray-800 bg-gray-950 flex flex-col overflow-hidden"
          style={{ width: rightWidth }}
        >
          <div className="p-3 border-b border-gray-800 shrink-0">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {selectedEntryId ? 'Editor' : 'Inspector'}
            </span>
          </div>
          {selectedEntryId ? (
            <EntryEditor entryId={selectedEntryId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-gray-600">Select an entry to edit</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
