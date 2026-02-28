import { useCallback, useState } from 'react'
import { Upload, Save, Undo2, Redo2 } from 'lucide-react'
import { TabBar } from './TabBar'
import { EntryList } from '@/components/entry-list/EntryList'
import { EntryEditor } from '@/components/editor/EntryEditor'
import { importFile, exportFile } from '@/services/file-service'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { cn } from '@/lib/cn'

export function WorkspaceShell() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const activeTab = useWorkspaceStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const [isDragOver, setIsDragOver] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const selectedEntryId = store ? store((s) => s.selection.selectedEntryId) : null
  // zundo exposes temporal state on the store instance (not via state selector)
  const temporalState = store?.temporal.getState()
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
    store?.temporal.getState().undo()
  }

  function handleRedo() {
    store?.temporal.getState().redo()
  }

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
        <aside className="w-64 shrink-0 border-r border-gray-800 bg-gray-950 flex flex-col">
          <div className="p-3 border-b border-gray-800 shrink-0">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Entries</span>
          </div>
          <EntryList />
        </aside>

        {/* Center panel: graph canvas placeholder */}
        <main
          className={cn(
            'flex-1 bg-gray-950 flex items-center justify-center',
            !activeTabId && 'cursor-default'
          )}
        >
          {!activeTabId ? (
            <div className="text-center space-y-3 pointer-events-none">
              <div className="text-5xl text-gray-700">⬡</div>
              <p className="text-sm text-gray-500">Drag a SillyTavern JSON file here</p>
              <p className="text-xs text-gray-600">or click the upload icon above</p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="text-4xl text-gray-700">⬡</div>
              <p className="text-xs text-gray-600">Graph visualization — Phase 2</p>
            </div>
          )}
        </main>

        {/* Right panel: entry editor */}
        <aside className="w-80 shrink-0 border-l border-gray-800 bg-gray-950 flex flex-col">
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
