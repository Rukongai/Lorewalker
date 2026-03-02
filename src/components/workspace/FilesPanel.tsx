import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Trash2, RotateCcw } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { listDocuments, deleteDocument, listSnapshots, deleteSnapshot } from '@/services/persistence-service'
import type { PersistedDocument, PersistedSnapshot } from '@/types'

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

interface FilesPanelProps {
  onRestoreDoc: (doc: PersistedDocument) => void
}

export function FilesPanel({ onRestoreDoc }: FilesPanelProps) {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const [historyDocs, setHistoryDocs] = useState<PersistedDocument[]>([])
  const [openSection, setOpenSection] = useState(true)
  const [historySection, setHistorySection] = useState(true)
  const [expandedTabIds, setExpandedTabIds] = useState<Set<string>>(new Set())
  const [snapshots, setSnapshots] = useState<Record<string, PersistedSnapshot[]>>({})

  const refreshHistory = useCallback(async () => {
    try {
      const allDocs = await listDocuments()
      setHistoryDocs(allDocs)
    } catch {
      // Non-fatal
    }
  }, [])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  async function handleDeleteDoc(tabId: string) {
    try {
      await deleteDocument(tabId)
      setHistoryDocs((prev) => prev.filter((d) => d.tabId !== tabId))
      setExpandedTabIds((prev) => {
        const next = new Set(prev)
        next.delete(tabId)
        return next
      })
      setSnapshots((prev) => {
        const next = { ...prev }
        delete next[tabId]
        return next
      })
    } catch {
      // Non-fatal
    }
  }

  async function handleToggleExpand(tabId: string) {
    setExpandedTabIds((prev) => {
      const next = new Set(prev)
      if (next.has(tabId)) {
        next.delete(tabId)
      } else {
        next.add(tabId)
        // Load snapshots if not already loaded
        if (!snapshots[tabId]) {
          listSnapshots(tabId).then((snaps) => {
            setSnapshots((s) => ({ ...s, [tabId]: snaps }))
          }).catch(() => {
            setSnapshots((s) => ({ ...s, [tabId]: [] }))
          })
        }
      }
      return next
    })
  }

  async function handleDeleteSnapshot(tabId: string, snapshotId: string) {
    try {
      await deleteSnapshot(tabId, snapshotId)
      setSnapshots((prev) => ({
        ...prev,
        [tabId]: (prev[tabId] ?? []).filter((s) => s.id !== snapshotId),
      }))
    } catch {
      // Non-fatal
    }
  }

  function handleRestoreSnapshot(doc: PersistedDocument, snap: PersistedSnapshot) {
    if (!window.confirm(`Open "${doc.fileMeta.fileName}" from snapshot "${snap.name}"? This will replace the current saved state.`)) return
    const positions = new Map(Object.entries(doc.graphPositions))
    documentStoreRegistry.create(doc.tabId, {
      entries: snap.entries,
      bookMeta: snap.bookMeta,
      graphPositions: positions,
      simulatorState: doc.simulatorState,
    })
    useWorkspaceStore.getState().openTab(doc.tabId, doc.fileMeta.fileName, doc.fileMeta)
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto text-xs">
      {/* Open section */}
      <div>
        <button
          className="flex items-center w-full px-3 py-2 text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors font-medium uppercase tracking-wider"
          onClick={() => setOpenSection((v) => !v)}
        >
          {openSection ? <ChevronDown size={12} className="mr-1.5 shrink-0" /> : <ChevronRight size={12} className="mr-1.5 shrink-0" />}
          Open ({tabs.length})
        </button>
        {openSection && (
          <ul>
            {tabs.length === 0 && (
              <li className="px-4 py-2 text-ctp-overlay0">No open files</li>
            )}
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  className={`w-full flex items-center gap-2 px-4 py-1.5 text-left transition-colors hover:bg-ctp-surface0 ${
                    activeTabId === tab.id ? 'text-ctp-accent bg-ctp-surface0/50' : 'text-ctp-text'
                  }`}
                  onClick={() => useWorkspaceStore.getState().switchTab(tab.id)}
                >
                  {tab.dirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-ctp-yellow shrink-0" title="Unsaved changes" />
                  )}
                  {!tab.dirty && (
                    <span className="w-1.5 h-1.5 shrink-0" />
                  )}
                  <span className="truncate flex-1">{tab.fileMeta.fileName}</span>
                  {activeTabId === tab.id && (
                    <span className="text-[10px] text-ctp-accent shrink-0">active</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-ctp-surface0" />

      {/* History section */}
      <div>
        <button
          className="flex items-center w-full px-3 py-2 text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors font-medium uppercase tracking-wider"
          onClick={() => setHistorySection((v) => !v)}
        >
          {historySection ? <ChevronDown size={12} className="mr-1.5 shrink-0" /> : <ChevronRight size={12} className="mr-1.5 shrink-0" />}
          History ({historyDocs.length})
        </button>
        {historySection && (() => {
          const openTabIds = new Set(tabs.map((t) => t.id))
          return (
          <ul>
            {historyDocs.length === 0 && (
              <li className="px-4 py-2 text-ctp-overlay0">No saved sessions</li>
            )}
            {historyDocs.map((doc) => {
              const isOpen = openTabIds.has(doc.tabId)
              return (
              <li key={doc.tabId}>
                {/* Doc row */}
                <div className="flex items-center gap-1 px-3 py-1.5 hover:bg-ctp-surface0 group">
                  <button
                    className="flex items-center gap-1.5 flex-1 text-left text-ctp-text hover:text-ctp-text min-w-0"
                    onClick={() => onRestoreDoc(doc)}
                    title={isOpen ? 'Switch to open tab' : 'Restore this session'}
                  >
                    {isOpen
                      ? <span className="w-[11px] h-[11px] shrink-0" />
                      : <RotateCcw size={11} className="shrink-0 text-ctp-overlay1" />
                    }
                    <span className="truncate flex-1">{doc.fileMeta.fileName}</span>
                    {isOpen && (
                      <span className="text-[10px] text-ctp-accent shrink-0 ml-1">open</span>
                    )}
                    <span className="text-ctp-overlay1 shrink-0 ml-1">{relativeTime(doc.savedAt)}</span>
                  </button>
                  <button
                    className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-surface1 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteDoc(doc.tabId)}
                    title="Delete from history"
                  >
                    <Trash2 size={11} />
                  </button>
                  <button
                    className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-subtext1 hover:bg-ctp-surface1 transition-colors"
                    onClick={() => handleToggleExpand(doc.tabId)}
                    title="Show snapshots"
                  >
                    {expandedTabIds.has(doc.tabId)
                      ? <ChevronDown size={11} />
                      : <ChevronRight size={11} />
                    }
                  </button>
                </div>

                {/* Snapshots */}
                {expandedTabIds.has(doc.tabId) && (
                  <ul className="pl-6 border-l border-ctp-surface0 ml-4 mb-1">
                    {(snapshots[doc.tabId] ?? []).length === 0 && (
                      <li className="px-2 py-1 text-ctp-overlay0">No snapshots</li>
                    )}
                    {(snapshots[doc.tabId] ?? []).map((snap) => (
                      <li key={snap.id} className="flex items-center gap-1 px-2 py-1 hover:bg-ctp-surface0 group/snap rounded">
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-ctp-subtext1">{snap.name}</div>
                          <div className="text-ctp-overlay0 text-[10px]">{relativeTime(snap.savedAt)}</div>
                        </div>
                        <button
                          className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-green hover:bg-ctp-surface1 transition-colors opacity-0 group-hover/snap:opacity-100"
                          onClick={() => handleRestoreSnapshot(doc, snap)}
                          title="Restore snapshot"
                        >
                          <RotateCcw size={10} />
                        </button>
                        <button
                          className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-surface1 transition-colors opacity-0 group-hover/snap:opacity-100"
                          onClick={() => handleDeleteSnapshot(doc.tabId, snap.id)}
                          title="Delete snapshot"
                        >
                          <Trash2 size={10} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )})}
          </ul>
          )
        })()}
      </div>
    </div>
  )
}
