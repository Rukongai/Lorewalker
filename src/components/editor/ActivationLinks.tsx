import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import type { RecursionGraph } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { getReachableEntries } from '@/services/graph-service'

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
          className={`text-xs truncate ${blocked ? 'text-ctp-overlay0 line-through' : 'text-ctp-subtext1'}`}
          title={name}
        >
          {name}
        </span>
        <button
          onClick={() => onNavigate(id)}
          className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-ctp-surface1 bg-ctp-surface0 text-ctp-overlay1 hover:border-ctp-accent hover:text-ctp-accent hover:bg-ctp-crust/40 transition-colors text-[10px]"
          title={`Navigate to ${name}`}
        >
          Go <ArrowRight size={9} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {keywords.map((kw, i) => (
          <span
            key={i}
            className="text-[10px] bg-ctp-sky/25 border border-ctp-sky/50 rounded px-1 text-ctp-sky"
          >
            {kw}
          </span>
        ))}
        {blocked && (
          <span className="text-[9px] text-ctp-yellow">blocked</span>
        )}
      </div>
    </div>
  )
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
          <span className="text-xs text-ctp-subtext0">
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

  const [hideBlockedLeft, setHideBlockedLeft] = useState(false)
  const [hideBlockedRight, setHideBlockedRight] = useState(false)

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

  const hasBlockedLeft = activatesThisRows.some((r) => r.blocked)
  const hasBlockedRight = thisActivatesRows.some((r) => r.blocked)

  const visibleLeft = hideBlockedLeft ? activatesThisRows.filter((r) => !r.blocked) : activatesThisRows
  const visibleRight = hideBlockedRight ? thisActivatesRows.filter((r) => !r.blocked) : thisActivatesRows

  return (
    <div className="flex h-full">
      {/* Activates This */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-ctp-surface1">
        <div className="px-3 py-1.5 border-b border-ctp-surface1 shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-ctp-overlay1 uppercase tracking-wider">
            Activates This{' '}
            <span className="text-ctp-overlay0 normal-case font-normal tracking-normal">
              [{hideBlockedLeft ? `${visibleLeft.length}/${activatesThisRows.length}` : activatesThisRows.length}]
            </span>
          </span>
          {hasBlockedLeft && (
            <span className="flex items-center gap-0.5">
              <HelpTooltip text="Blocked entries are links prevented by 'Prevent Further Recursion' or 'Non-recursable' flags. They appear struck through. Toggle to hide them." />
              <Tooltip text={hideBlockedLeft ? 'Show blocked' : 'Hide blocked'}>
                <button
                  onClick={() => setHideBlockedLeft((v) => !v)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                    hideBlockedLeft
                      ? 'bg-ctp-accent/35 border-ctp-accent/60 text-ctp-accent font-medium'
                      : 'bg-ctp-surface0 border-ctp-surface1 text-ctp-overlay0 hover:text-ctp-subtext0'
                  }`}
                >
                  {hideBlockedLeft ? 'Blocked: Visible' : 'Blocked: Hide'}
                </button>
              </Tooltip>
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {visibleLeft.length === 0 ? (
            <span className="text-[10px] text-ctp-overlay0 italic">
              {hideBlockedLeft && activatesThisRows.length > 0 ? 'All blocked (hidden)' : 'None'}
            </span>
          ) : (
            visibleLeft.map((row) => (
              <LinkRow key={row.id} {...row} onNavigate={onNavigate} />
            ))
          )}
        </div>
      </div>

      {/* This Activates */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-1.5 border-b border-ctp-surface1 shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-ctp-overlay1 uppercase tracking-wider">
            This Activates{' '}
            <span className="text-ctp-overlay0 normal-case font-normal tracking-normal">
              [{hideBlockedRight ? `${visibleRight.length}/${thisActivatesRows.length}` : thisActivatesRows.length}]
            </span>
          </span>
          {hasBlockedRight && (
            <span className="flex items-center gap-0.5">
              <HelpTooltip text="Blocked entries are links prevented by 'Prevent Further Recursion' or 'Non-recursable' flags. They appear struck through. Toggle to hide them." />
              <Tooltip text={hideBlockedRight ? 'Show blocked' : 'Hide blocked'}>
                <button
                  onClick={() => setHideBlockedRight((v) => !v)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                    hideBlockedRight
                      ? 'bg-ctp-accent/35 border-ctp-accent/60 text-ctp-accent font-medium'
                      : 'bg-ctp-surface0 border-ctp-surface1 text-ctp-overlay0 hover:text-ctp-subtext0'
                  }`}
                >
                  {hideBlockedRight ? 'Blocked: Visible' : 'Blocked: Hide'}
                </button>
              </Tooltip>
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {visibleRight.length === 0 ? (
            <span className="text-[10px] text-ctp-overlay0 italic">
              {hideBlockedRight && thisActivatesRows.length > 0 ? 'All blocked (hidden)' : 'None'}
            </span>
          ) : (
            visibleRight.map((row) => (
              <LinkRow key={row.id} {...row} onNavigate={onNavigate} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
