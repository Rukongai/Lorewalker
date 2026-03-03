import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

export interface ConnectionRow {
  id: string
  name: string
  keywords: string[]
  blocked: boolean
}

interface ConnectionsListProps {
  /** "Activates This" column — entries whose content references this entry's keys */
  incoming: ConnectionRow[]
  /** "This Activates" column — entries this entry's content references */
  outgoing: ConnectionRow[]
  onNavigate?: (id: string) => void
}

function LinkRow({ id, keywords, blocked, onNavigate, name }: ConnectionRow & { onNavigate?: (id: string) => void }) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-xs truncate ${blocked ? 'text-ctp-overlay0 line-through' : 'text-ctp-subtext1'}`}
          title={name}
        >
          {name}
        </span>
        {onNavigate && (
          <button
            onClick={() => onNavigate(id)}
            className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-ctp-surface1 bg-ctp-surface0 text-ctp-overlay1 hover:border-ctp-accent hover:text-ctp-accent hover:bg-ctp-crust/40 transition-colors text-[10px]"
            title={`Navigate to ${name}`}
          >
            Go <ArrowRight size={9} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {keywords.map((kw, i) => (
          <span key={i} className="text-[10px] bg-ctp-sky/25 border border-ctp-sky/50 rounded px-1 text-ctp-sky">
            {kw}
          </span>
        ))}
        {blocked && <span className="text-[9px] text-ctp-yellow">blocked</span>}
      </div>
    </div>
  )
}

export function ConnectionsList({ incoming, outgoing, onNavigate }: ConnectionsListProps) {
  const [hideBlockedLeft, setHideBlockedLeft] = useState(true)
  const [hideBlockedRight, setHideBlockedRight] = useState(true)

  const hasBlockedLeft = incoming.some((r) => r.blocked)
  const hasBlockedRight = outgoing.some((r) => r.blocked)
  const visibleLeft = hideBlockedLeft ? incoming.filter((r) => !r.blocked) : incoming
  const visibleRight = hideBlockedRight ? outgoing.filter((r) => !r.blocked) : outgoing

  return (
    <div className="flex h-full">
      {/* Activates This */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-ctp-surface1">
        <div className="px-3 py-1.5 border-b border-ctp-surface1 shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-ctp-overlay1 uppercase tracking-wider">
            Activates This{' '}
            <span className="text-ctp-overlay0 normal-case font-normal tracking-normal">
              [{hideBlockedLeft ? `${visibleLeft.length}/${incoming.length}` : incoming.length}]
            </span>
          </span>
          {hasBlockedLeft && (
            <span className="flex items-center gap-0.5">
              <HelpTooltip text="Blocked entries are links prevented by 'Prevent Further Recursion' or 'Non-recursable' flags." />
              <Tooltip text={hideBlockedLeft ? 'Show blocked' : 'Hide blocked'}>
                <button
                  onClick={() => setHideBlockedLeft((v) => !v)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                    hideBlockedLeft
                      ? 'bg-ctp-accent/35 border-ctp-accent/60 text-ctp-accent font-medium'
                      : 'bg-ctp-surface0 border-ctp-surface1 text-ctp-overlay0 hover:text-ctp-subtext0'
                  }`}
                >
                  {hideBlockedLeft ? 'Blocked: Hidden' : 'Blocked: Visible'}
                </button>
              </Tooltip>
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {visibleLeft.length === 0 ? (
            <span className="text-[10px] text-ctp-overlay0 italic">
              {hideBlockedLeft && incoming.length > 0 ? 'All blocked (hidden)' : 'None'}
            </span>
          ) : (
            visibleLeft.map((row) => <LinkRow key={row.id} {...row} onNavigate={onNavigate} />)
          )}
        </div>
      </div>

      {/* This Activates */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-1.5 border-b border-ctp-surface1 shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-ctp-overlay1 uppercase tracking-wider">
            This Activates{' '}
            <span className="text-ctp-overlay0 normal-case font-normal tracking-normal">
              [{hideBlockedRight ? `${visibleRight.length}/${outgoing.length}` : outgoing.length}]
            </span>
          </span>
          {hasBlockedRight && (
            <span className="flex items-center gap-0.5">
              <HelpTooltip text="Blocked entries are links prevented by 'Prevent Further Recursion' or 'Non-recursable' flags." />
              <Tooltip text={hideBlockedRight ? 'Show blocked' : 'Hide blocked'}>
                <button
                  onClick={() => setHideBlockedRight((v) => !v)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                    hideBlockedRight
                      ? 'bg-ctp-accent/35 border-ctp-accent/60 text-ctp-accent font-medium'
                      : 'bg-ctp-surface0 border-ctp-surface1 text-ctp-overlay0 hover:text-ctp-subtext0'
                  }`}
                >
                  {hideBlockedRight ? 'Blocked: Hidden' : 'Blocked: Visible'}
                </button>
              </Tooltip>
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {visibleRight.length === 0 ? (
            <span className="text-[10px] text-ctp-overlay0 italic">
              {hideBlockedRight && outgoing.length > 0 ? 'All blocked (hidden)' : 'None'}
            </span>
          ) : (
            visibleRight.map((row) => <LinkRow key={row.id} {...row} onNavigate={onNavigate} />)
          )}
        </div>
      </div>
    </div>
  )
}
