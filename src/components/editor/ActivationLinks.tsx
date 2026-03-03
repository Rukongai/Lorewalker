import { useMemo, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import type { RecursionGraph } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { getReachableEntries } from '@/services/graph-service'
import { ConnectionsList } from '@/features/health/ConnectionsList'
import type { ConnectionRow } from '@/features/health/ConnectionsList'

interface ActivationLinksProps {
  entryId: string
  graph: RecursionGraph
  onNavigate: (entryId: string) => void
}

interface ActivationLinksHeaderProps {
  entryId: string
  graph: RecursionGraph
}

export function ActivationLinksHeader({ entryId, graph }: ActivationLinksHeaderProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)

  const [maxRecursions, setMaxRecursions] = useState(0)

  const reachable = useMemo(
    () => getReachableEntries(entryId, graph, maxRecursions || undefined),
    [entryId, graph, maxRecursions],
  )

  const reachPercent = entries.length > 1
    ? Math.round((reachable.size / (entries.length - 1)) * 100)
    : 0

  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-ctp-overlay1 uppercase tracking-wider">Reach</span>
        {reachable.size > 0 ? (
          <span className={`text-xs ${reachPercent > 75 ? 'text-ctp-red' : reachPercent > 50 ? 'text-ctp-yellow' : 'text-ctp-subtext0'}`}>
            ~{reachPercent}%{' '}
            <span className="text-ctp-overlay0">
              ({reachable.size} of {entries.length - 1})
            </span>
          </span>
        ) : (
          <span className="text-xs text-ctp-overlay0">—</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-ctp-overlay1 uppercase tracking-wider">Recursions</span>
        <HelpTooltip text="Max recursion hops to follow (0 = unlimited)" />
        <input
          type="number"
          min={0}
          value={maxRecursions === 0 ? '' : maxRecursions}
          placeholder="∞"
          onChange={(e) => {
            const val = parseInt(e.target.value, 10)
            setMaxRecursions(isNaN(val) || val < 0 ? 0 : val)
          }}
          className="w-10 text-xs text-center bg-ctp-surface0 border border-ctp-surface1 rounded px-1 py-0.5 text-ctp-subtext0 placeholder:text-ctp-overlay0 focus:outline-none focus:border-ctp-accent"
        />
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

  function buildLinkRows(sourceIds: Iterable<string>, isReverse: boolean): ConnectionRow[] {
    const rows: ConnectionRow[] = []
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

  const incoming = buildLinkRows(activatesThisIds, true)
  const outgoing = buildLinkRows(thisActivatesIds, false)

  return <ConnectionsList incoming={incoming} outgoing={outgoing} onNavigate={onNavigate} />
}
