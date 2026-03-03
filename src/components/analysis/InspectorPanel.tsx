import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { FindingsList } from '@/features/health/FindingsList'
import { ConnectionsList } from '@/features/health/ConnectionsList'
import type { ConnectionRow } from '@/features/health/ConnectionsList'
import { cn } from '@/lib/cn'
import { getTypeBadge } from '@/lib/entry-badge'
import type { RecursionGraph } from '@/types'

interface InspectorPanelProps {
  tabId: string | null
  graph: RecursionGraph
  showFindings?: boolean
  onNavigate?: (id: string) => void
  selectedEntryIdOverride?: string
}

export function InspectorPanel({ tabId, graph, showFindings = true, onNavigate, selectedEntryIdOverride }: InspectorPanelProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const storeSelectedEntryId = activeStore((s) => s.selection.selectedEntryId)
  const selectedEntryId = selectedEntryIdOverride ?? storeSelectedEntryId
  const entries = activeStore((s) => s.entries)
  const findings = activeStore((s) => s.findings)

  function handleSelectEntry(entryId: string) {
    realStore?.getState().selectEntry(entryId)
    onNavigate?.(entryId)
  }

  if (!tabId || !selectedEntryId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Select an entry to inspect</p>
      </div>
    )
  }

  const entry = entries.find((e) => e.id === selectedEntryId)
  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Entry not found</p>
      </div>
    )
  }

  const entryFindings = showFindings ? findings.filter((f) => f.entryIds.includes(selectedEntryId)) : []
  const incomingIds = [...(graph.reverseEdges.get(selectedEntryId) ?? [])]
  const outgoingIds = [...(graph.edges.get(selectedEntryId) ?? [])]

  const entryName = (id: string) => entries.find((e) => e.id === id)?.name || id

  const badge = getTypeBadge(entry)

  const incomingRows: ConnectionRow[] = incomingIds.map((id) => ({
    id,
    name: entryName(id),
    keywords: [...(graph.edgeMeta.get(`${id}\u2192${selectedEntryId}`)?.matchedKeywords ?? [])],
    blocked: false,
  }))

  const outgoingRows: ConnectionRow[] = outgoingIds.map((id) => ({
    id,
    name: entryName(id),
    keywords: [...(graph.edgeMeta.get(`${selectedEntryId}\u2192${id}`)?.matchedKeywords ?? [])],
    blocked: false,
  }))

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Entry header */}
      <div className="p-3 border-b border-ctp-surface0 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-ctp-text truncate flex-1">{entry.name || '(unnamed)'}</span>
          <span className={cn('text-[10px] font-mono px-1 py-0.5 rounded shrink-0', badge.color)}>
            {badge.label}
          </span>
        </div>
        <p className="text-[10px] text-ctp-overlay1">{entry.tokenCount} tokens</p>
      </div>

      {/* Findings for this entry */}
      {entryFindings.length > 0 && (
        <div className="border-b border-ctp-surface0 shrink-0">
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
              Issues ({entryFindings.length})
            </span>
          </div>
          <FindingsList findings={entryFindings} onSelectEntry={handleSelectEntry} />
        </div>
      )}

      {/* Connections */}
      <div className="flex-1 border-b border-ctp-surface0 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 px-3 py-1.5">
          Connections
        </p>
        <ConnectionsList
          incoming={incomingRows}
          outgoing={outgoingRows}
          onNavigate={handleSelectEntry}
        />
      </div>
    </div>
  )
}
