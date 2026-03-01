import { ArrowRight } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import type { RecursionGraph } from '@/types'

interface ActivationLinksProps {
  entryId: string
  graph: RecursionGraph
  onNavigate: (entryId: string) => void
}

interface LinkRowProps {
  id: string
  keywords: string[]
  blocked: boolean
  onNavigate: (entryId: string) => void
  name: string
}

function LinkRow({ id, keywords, blocked, onNavigate, name }: LinkRowProps) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-xs truncate ${blocked ? 'text-gray-500 line-through' : 'text-gray-200'}`}
          title={name}
        >
          {name}
        </span>
        <button
          onClick={() => onNavigate(id)}
          className="shrink-0 p-0.5 rounded text-gray-500 hover:text-indigo-400 transition-colors"
          title={`Navigate to ${name}`}
        >
          <ArrowRight size={10} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {keywords.map((kw, i) => (
          <span
            key={i}
            className="text-[10px] bg-gray-800 border border-gray-700 rounded px-1 text-gray-400"
          >
            {kw}
          </span>
        ))}
        {blocked && (
          <span className="text-[9px] text-amber-400">blocked</span>
        )}
      </div>
    </div>
  )
}

export function ActivationLinks({ entryId, graph, onNavigate }: ActivationLinksProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)

  const entryMap = new Map(entries.map((e) => [e.id, e.name]))

  const activatesThisIds = graph.reverseEdges.get(entryId) ?? new Set<string>()
  const thisActivatesIds = graph.edges.get(entryId) ?? new Set<string>()

  function buildLinkRows(sourceIds: Iterable<string>, isReverse: boolean) {
    const rows: Array<{ id: string; name: string; keywords: string[]; blocked: boolean }> = []
    for (const otherId of sourceIds) {
      const name = entryMap.get(otherId) ?? otherId
      const edgeKey = isReverse
        ? `${otherId}\u2192${entryId}`
        : `${entryId}\u2192${otherId}`
      const meta = graph.edgeMeta.get(edgeKey)
      const keywords = meta?.matchedKeywords ?? []
      const blocked = (meta?.blockedByPreventRecursion ?? false) || (meta?.blockedByExcludeRecursion ?? false)
      rows.push({ id: otherId, name, keywords, blocked })
    }
    return rows
  }

  const activatesThisRows = buildLinkRows(activatesThisIds, true)
  const thisActivatesRows = buildLinkRows(thisActivatesIds, false)

  return (
    <div className="flex h-full">
      {/* Activates This */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-gray-700">
        <div className="px-3 py-1.5 border-b border-gray-700 shrink-0">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Activates This{' '}
            <span className="text-gray-600 normal-case font-normal tracking-normal">
              [{activatesThisRows.length}]
            </span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {activatesThisRows.length === 0 ? (
            <span className="text-[10px] text-gray-600 italic">None</span>
          ) : (
            activatesThisRows.map((row) => (
              <LinkRow key={row.id} {...row} onNavigate={onNavigate} />
            ))
          )}
        </div>
      </div>

      {/* This Activates */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-1.5 border-b border-gray-700 shrink-0">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            This Activates{' '}
            <span className="text-gray-600 normal-case font-normal tracking-normal">
              [{thisActivatesRows.length}]
            </span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {thisActivatesRows.length === 0 ? (
            <span className="text-[10px] text-gray-600 italic">None</span>
          ) : (
            thisActivatesRows.map((row) => (
              <LinkRow key={row.id} {...row} onNavigate={onNavigate} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
