import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Trash2, RotateCcw } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { storageAdapter } from '@/lib/storage'
import { generateId } from '@/lib/uuid'
import type { PersistedDocument, PersistedSnapshot, TabMeta } from '@/types'

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
  onFileOpened: () => void
  snapshotSaveCount: number
}

export function FilesPanel({ onRestoreDoc, onFileOpened, snapshotSaveCount }: FilesPanelProps) {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const [historyDocs, setHistoryDocs] = useState<PersistedDocument[]>([])
  const [openSection, setOpenSection] = useState(true)
  const [historySection, setHistorySection] = useState(true)
  const [expandedTabIds, setExpandedTabIds] = useState<Set<string>>(new Set())
  const [snapshots, setSnapshots] = useState<Record<string, PersistedSnapshot[]>>({})
  const [openSnapshotIds, setOpenSnapshotIds] = useState<Record<string, string>>({})

  const refreshHistory = useCallback(async () => {
    try {
      const allDocs = await storageAdapter.listDocuments()
      setHistoryDocs(allDocs)
    } catch {
      // Non-fatal
    }
  }, [])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  useEffect(() => {
    if (snapshotSaveCount === 0) return
    // Invalidate and re-fetch snapshots for all currently expanded tabs
    const expandedIds = Array.from(expandedTabIds)
    if (expandedIds.length === 0) {
      // No tabs expanded — just clear the cache so next expand fetches fresh
      setSnapshots({})
      return
    }
    Promise.all(
      expandedIds.map((tabId) =>
        storageAdapter.listSnapshots(tabId)
          .then((snaps) => ({ tabId, snaps }))
          .catch(() => ({ tabId, snaps: [] as PersistedSnapshot[] }))
      )
    ).then((results) => {
      setSnapshots((prev) => {
        const next = { ...prev }
        for (const { tabId, snaps } of results) {
          next[tabId] = snaps
        }
        return next
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- expandedTabIds intentionally omitted:
  // this effect must only fire when a snapshot is saved (snapshotSaveCount increments), not
  // every time the user expands or collapses a tab row. expandedTabIds is read synchronously
  // at fire-time which is correct behavior.
  }, [snapshotSaveCount])

  async function handleDeleteDoc(tabId: string) {
    const doc = historyDocs.find((d) => d.tabId === tabId)
    const name = doc?.fileMeta.fileName ?? 'this file'
    if (!window.confirm(`Delete "${name}" from history? This cannot be undone.`)) return
    try {
      await storageAdapter.deleteDocument(tabId)
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
          storageAdapter.listSnapshots(tabId).then((snaps) => {
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
    const snap = snapshots[tabId]?.find((s) => s.id === snapshotId)
    const name = snap?.name ?? 'this snapshot'
    if (!window.confirm(`Delete snapshot "${name}"? This cannot be undone.`)) return
    try {
      await storageAdapter.deleteSnapshot(tabId, snapshotId)
      setSnapshots((prev) => ({
        ...prev,
        [tabId]: (prev[tabId] ?? []).filter((s) => s.id !== snapshotId),
      }))
    } catch {
      // Non-fatal
    }
  }

  async function autoSnapshotLive(tabId: string): Promise<void> {
    const store = documentStoreRegistry.get(tabId)
    if (!store) return
    const state = store.getState()
    const now = new Date()
    const timeStr = now.toTimeString().slice(0, 8)
    const autoSnap: PersistedSnapshot = {
      id: generateId(),
      tabId,
      name: `Auto-save — ${timeStr}`,
      savedAt: now.toISOString(),
      entries: state.entries,
      bookMeta: state.bookMeta,
    }
    await storageAdapter.saveSnapshot(autoSnap)
    const snaps = await storageAdapter.listSnapshots(tabId).catch(() => [] as PersistedSnapshot[])
    setSnapshots((prev) => ({ ...prev, [tabId]: snaps }))
  }

  async function handleRestoreSnapshotForOpenTab(tab: TabMeta, snap: PersistedSnapshot) {
    if (!window.confirm(`Restore snapshot "${snap.name}"? Current state will be auto-saved first.`)) return
    await autoSnapshotLive(tab.id)
    const store = documentStoreRegistry.get(tab.id)
    const state = store?.getState()
    documentStoreRegistry.create(tab.id, {
      entries: snap.entries,
      bookMeta: snap.bookMeta,
      graphPositions: state?.graphPositions ?? new Map(),
      simulatorState: state?.simulatorState ?? undefined,
      cardPayload: state?.cardPayload ?? null,
    })
    useWorkspaceStore.getState().openTab(tab.id, tab.fileMeta.fileName, tab.fileMeta)
    setOpenSnapshotIds((prev) => ({ ...prev, [tab.id]: snap.id }))
    onFileOpened()
  }

  async function handleRestoreSnapshot(doc: PersistedDocument, snap: PersistedSnapshot) {
    if (!window.confirm(`Restore snapshot "${snap.name}"? Current state will be auto-saved first.`)) return
    const liveStore = documentStoreRegistry.get(doc.tabId)
    if (liveStore) {
      await autoSnapshotLive(doc.tabId)
    } else {
      // Tab not open — auto-snapshot from the persisted doc state
      const now = new Date()
      const timeStr = now.toTimeString().slice(0, 8)
      const autoSnap: PersistedSnapshot = {
        id: generateId(),
        tabId: doc.tabId,
        name: `Auto-save — ${timeStr}`,
        savedAt: now.toISOString(),
        entries: doc.entries,
        bookMeta: doc.bookMeta,
      }
      await storageAdapter.saveSnapshot(autoSnap).catch(() => {})
      const snaps = await storageAdapter.listSnapshots(doc.tabId).catch(() => [] as PersistedSnapshot[])
      setSnapshots((prev) => ({ ...prev, [doc.tabId]: snaps }))
    }
    const positions = new Map(Object.entries(doc.graphPositions))
    documentStoreRegistry.create(doc.tabId, {
      entries: snap.entries,
      bookMeta: snap.bookMeta,
      graphPositions: positions,
      simulatorState: doc.simulatorState,
      cardPayload: doc.cardPayload ?? null,
      initialFormat: doc.activeFormat ?? doc.fileMeta.originalFormat,
    })
    useWorkspaceStore.getState().openTab(doc.tabId, doc.fileMeta.fileName, doc.fileMeta)
    setOpenSnapshotIds((prev) => ({ ...prev, [doc.tabId]: snap.id }))
    onFileOpened()
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
                {/* Row */}
                <div className="flex items-center gap-1 px-3 py-1.5 hover:bg-ctp-surface0">
                  <Tooltip text="Show snapshots">
                    <button
                      className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-subtext1 hover:bg-ctp-surface1 transition-colors"
                      onClick={() => handleToggleExpand(tab.id)}
                    >
                      {expandedTabIds.has(tab.id)
                        ? <ChevronDown size={11} />
                        : <ChevronRight size={11} />
                      }
                    </button>
                  </Tooltip>
                  {tab.dirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-ctp-yellow shrink-0" title="Unsaved changes" />
                  )}
                  {!tab.dirty && (
                    <span className="w-1.5 h-1.5 shrink-0" />
                  )}
                  <button
                    className={`truncate flex-1 text-left px-1 transition-colors ${
                      activeTabId === tab.id ? 'text-ctp-accent' : 'text-ctp-text'
                    }`}
                    onClick={() => { useWorkspaceStore.getState().switchTab(tab.id); onFileOpened() }}
                  >
                    {tab.fileMeta.fileName}
                  </button>
                  {activeTabId === tab.id && (
                    <span className="text-[10px] text-ctp-accent shrink-0">active</span>
                  )}
                </div>

                {/* Snapshots */}
                {expandedTabIds.has(tab.id) && (
                  <ul className="pl-6 border-l border-ctp-surface0 ml-4 mb-1">
                    {/* Current state — already live, no restore needed */}
                    <li className="flex items-center gap-1.5 px-2 py-1">
                      <span className="text-[10px] text-ctp-accent shrink-0">active</span>
                      <span className="flex-1 text-ctp-subtext1">Current state</span>
                      <span className="text-ctp-overlay0 shrink-0 text-[10px]">(live)</span>
                    </li>
                    {(snapshots[tab.id] ?? []).length === 0 && (
                      <li className="px-2 py-1 text-ctp-overlay0">No snapshots</li>
                    )}
                    {(snapshots[tab.id] ?? []).map((snap) => (
                      <li key={snap.id} className="flex items-center gap-1 px-2 py-1 hover:bg-ctp-surface0 group/snap rounded">
                        {openSnapshotIds[tab.id] === snap.id && (
                          <span className="text-[10px] text-ctp-accent shrink-0">open</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-ctp-subtext1">{snap.name}</div>
                          <div className="text-ctp-overlay0 text-[10px]">{relativeTime(snap.savedAt)}</div>
                        </div>
                        <Tooltip text="Restore snapshot">
                          <button
                            className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-green hover:bg-ctp-surface1 transition-colors opacity-0 group-hover/snap:opacity-100"
                            onClick={() => handleRestoreSnapshotForOpenTab(tab, snap)}
                          >
                            <RotateCcw size={10} />
                          </button>
                        </Tooltip>
                        <Tooltip text="Delete snapshot">
                          <button
                            className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-surface1 transition-colors opacity-0 group-hover/snap:opacity-100"
                            onClick={() => handleDeleteSnapshot(tab.id, snap.id)}
                          >
                            <Trash2 size={10} />
                          </button>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                )}
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
                <div className="flex items-center gap-1 px-3 py-1.5 hover:bg-ctp-surface0">
                  <Tooltip text="Show snapshots">
                    <button
                      className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-subtext1 hover:bg-ctp-surface1 transition-colors"
                      onClick={() => handleToggleExpand(doc.tabId)}
                    >
                      {expandedTabIds.has(doc.tabId)
                        ? <ChevronDown size={11} />
                        : <ChevronRight size={11} />
                      }
                    </button>
                  </Tooltip>
                  <button
                    className="truncate flex-1 text-left text-ctp-text px-1 hover:text-ctp-accent transition-colors"
                    onClick={() => {
                      onRestoreDoc(doc)
                      setOpenSnapshotIds((prev) => { const next = { ...prev }; delete next[doc.tabId]; return next })
                      onFileOpened()
                    }}
                  >
                    {doc.fileMeta.fileName}
                  </button>
                  <Tooltip text="Delete from history">
                    <button
                      className="ml-auto p-0.5 rounded text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-surface1 transition-colors"
                      onClick={() => handleDeleteDoc(doc.tabId)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </Tooltip>
                </div>

                {/* Snapshots */}
                {expandedTabIds.has(doc.tabId) && (
                  <ul className="pl-6 border-l border-ctp-surface0 ml-4 mb-1">
                    {/* Current state entry */}
                    <li>
                      <button
                        className="flex items-center gap-1.5 w-full px-2 py-1 text-left hover:bg-ctp-surface0 rounded transition-colors"
                        onClick={() => {
                          onRestoreDoc(doc)
                          setOpenSnapshotIds((prev) => { const next = { ...prev }; delete next[doc.tabId]; return next })
                          onFileOpened()
                        }}
                      >
                        {isOpen && !openSnapshotIds[doc.tabId] && (
                          <span className="text-[10px] text-ctp-accent shrink-0">open</span>
                        )}
                        <span className="flex-1 text-ctp-subtext1">Current state</span>
                        <span className="text-ctp-overlay0 shrink-0 text-[10px]">{relativeTime(doc.savedAt)}</span>
                      </button>
                    </li>
                    {(snapshots[doc.tabId] ?? []).length === 0 && (
                      <li className="px-2 py-1 text-ctp-overlay0">No snapshots</li>
                    )}
                    {(snapshots[doc.tabId] ?? []).map((snap) => (
                      <li key={snap.id} className="flex items-center gap-1 px-2 py-1 hover:bg-ctp-surface0 group/snap rounded">
                        {openSnapshotIds[doc.tabId] === snap.id && (
                          <span className="text-[10px] text-ctp-accent shrink-0">open</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-ctp-subtext1">{snap.name}</div>
                          <div className="text-ctp-overlay0 text-[10px]">{relativeTime(snap.savedAt)}</div>
                        </div>
                        <Tooltip text="Restore snapshot">
                          <button
                            className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-green hover:bg-ctp-surface1 transition-colors opacity-0 group-hover/snap:opacity-100"
                            onClick={() => handleRestoreSnapshot(doc, snap)}
                          >
                            <RotateCcw size={10} />
                          </button>
                        </Tooltip>
                        <Tooltip text="Delete snapshot">
                          <button
                            className="p-0.5 rounded text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-surface1 transition-colors opacity-0 group-hover/snap:opacity-100"
                            onClick={() => handleDeleteSnapshot(doc.tabId, snap.id)}
                          >
                            <Trash2 size={10} />
                          </button>
                        </Tooltip>
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
