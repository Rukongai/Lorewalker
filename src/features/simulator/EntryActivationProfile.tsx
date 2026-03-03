import type { WorkingEntry, ActivationResult, EntryPosition } from '@/types'

export interface EntryActivationProfileProps {
  entry: WorkingEntry
  entries: WorkingEntry[]
  result: ActivationResult | null
}

const POSITION_LABELS: Record<EntryPosition, string> = {
  0: 'Before Char Defs',
  1: 'After Char Defs',
  2: 'Before Example Messages',
  3: 'After Example Messages',
  4: '@ Depth',
  5: "Top of Author's Note",
  6: "Bottom of Author's Note",
  7: 'Outlet',
}

const SKIP_REASON_LABELS: Record<string, string> = {
  'budget-exhausted': 'Budget exhausted',
  'probability-failed': 'Probability failed',
  cooldown: 'On cooldown',
  delay: 'Delayed',
  disabled: 'Disabled',
}

function resolveName(entries: WorkingEntry[], id: string): string {
  return entries.find((e) => e.id === id)?.name ?? id
}

export function EntryActivationProfile({ entry, entries, result }: EntryActivationProfileProps) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-full py-6">
        <p className="text-sm text-ctp-overlay1 text-center px-4">
          Run a simulation to see this entry's activation profile.
        </p>
      </div>
    )
  }

  const activated = result.activatedEntries.find((ae) => ae.entryId === entry.id)
  const skipped = result.skippedEntries.find((se) => se.entryId === entry.id)

  if (activated) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-ctp-green/20 text-ctp-green">
            Activated via {activated.activatedBy}
          </span>
        </div>

        {activated.activatedBy === 'keyword' && activated.matchedKeywords.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-ctp-overlay1 font-semibold uppercase tracking-wider">
              Matched keywords
            </p>
            <div className="flex flex-wrap gap-1">
              {activated.matchedKeywords.map((kw, i) => (
                <span key={i} className="text-[10px] bg-ctp-blue/20 text-ctp-blue rounded px-1.5 py-0.5">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {activated.activatedBy === 'recursion' && activated.triggerChain.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-ctp-overlay1 font-semibold uppercase tracking-wider">
              Trigger chain
            </p>
            <div className="flex items-center flex-wrap gap-1 text-xs">
              {activated.triggerChain.map((id, i) => (
                <span key={id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-ctp-overlay0">→</span>}
                  <span className="text-ctp-text">{resolveName(entries, id)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-ctp-overlay1">Token cost:</span>
            <span className="text-ctp-text font-medium tabular-nums">{activated.tokenCost}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ctp-overlay1">Insertion:</span>
            <span className="text-ctp-text">{POSITION_LABELS[activated.insertionPosition]}</span>
          </div>
        </div>
      </div>
    )
  }

  if (skipped) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-ctp-peach/20 text-ctp-peach">
            Skipped — {SKIP_REASON_LABELS[skipped.reason] ?? skipped.reason}
          </span>
        </div>

        {skipped.matchedKeywords.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-ctp-overlay1 font-semibold uppercase tracking-wider">
              Keywords found
            </p>
            <div className="flex flex-wrap gap-1">
              {skipped.matchedKeywords.map((kw, i) => (
                <span key={i} className="text-[10px] bg-ctp-surface1 text-ctp-subtext0 rounded px-1.5 py-0.5">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full py-6">
      <p className="text-sm text-ctp-overlay1 text-center px-4">
        Not triggered — no matching keywords found in the current messages.
      </p>
    </div>
  )
}
