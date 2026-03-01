import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { FindingItem } from './FindingItem'
import type { RecursionGraph } from '@/types'

interface InspectorPanelProps {
  tabId: string | null
  graph: RecursionGraph
}

export function InspectorPanel({ tabId, graph }: InspectorPanelProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const selectedEntryId = activeStore((s) => s.selection.selectedEntryId)
  const entries = activeStore((s) => s.entries)
  const findings = activeStore((s) => s.findings)

  function handleSelectEntry(entryId: string) {
    realStore?.getState().selectEntry(entryId)
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

  const entryFindings = findings.filter((f) => f.entryIds.includes(selectedEntryId))
  const incomingIds = [...(graph.reverseEdges.get(selectedEntryId) ?? [])]
  const outgoingIds = [...(graph.edges.get(selectedEntryId) ?? [])]

  const entryName = (id: string) => entries.find((e) => e.id === id)?.name || id

  const typeBadge = !entry.enabled
    ? 'OFF'
    : entry.constant
    ? 'CONST'
    : entry.selective
    ? 'SEL'
    : 'KW'

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Entry header */}
      <div className="p-3 border-b border-ctp-surface0 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-ctp-text truncate flex-1">{entry.name || '(unnamed)'}</span>
          <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-ctp-surface1 text-ctp-subtext0 shrink-0">
            {typeBadge}
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
          {entryFindings.map((f) => (
            <FindingItem key={f.id} finding={f} onSelectEntry={handleSelectEntry} />
          ))}
        </div>
      )}

      {/* Incoming edges */}
      <div className="border-b border-ctp-surface0 shrink-0 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1.5">
          Triggered by ({incomingIds.length})
        </p>
        {incomingIds.length === 0 ? (
          <p className="text-[10px] text-ctp-overlay0">No incoming edges</p>
        ) : (
          <div className="space-y-1">
            {incomingIds.map((id) => (
              <button
                key={id}
                onClick={() => handleSelectEntry(id)}
                className="block w-full text-left text-[10px] text-ctp-subtext1 hover:text-ctp-text truncate transition-colors"
              >
                → {entryName(id)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing edges */}
      <div className="p-3 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1.5">
          Triggers ({outgoingIds.length})
        </p>
        {outgoingIds.length === 0 ? (
          <p className="text-[10px] text-ctp-overlay0">No outgoing edges</p>
        ) : (
          <div className="space-y-1">
            {outgoingIds.map((id) => (
              <button
                key={id}
                onClick={() => handleSelectEntry(id)}
                className="block w-full text-left text-[10px] text-ctp-subtext1 hover:text-ctp-text truncate transition-colors"
              >
                → {entryName(id)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
