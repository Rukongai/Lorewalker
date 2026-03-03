import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { RecursionStep, WorkingEntry } from '@/types'

export interface RecursionTraceViewProps {
  steps: RecursionStep[]
  entries: WorkingEntry[]
}

function entryName(entries: WorkingEntry[], id: string): string {
  return entries.find((e) => e.id === id)?.name ?? id
}

export function RecursionTraceView({ steps, entries }: RecursionTraceViewProps) {
  const [stepIndex, setStepIndex] = useState<number | 'all'>(0)

  if (steps.length === 0) {
    return (
      <p className="text-xs text-ctp-overlay1 px-3 py-2">No recursion occurred.</p>
    )
  }

  const currentScanRound = stepIndex !== 'all' ? steps[stepIndex as number].step + 1 : null

  return (
    <div className="flex flex-col gap-2">
      {/* Controls */}
      <div className="flex items-center gap-1 px-3">
        {stepIndex !== 'all' && (
          <>
            <button
              onClick={() => setStepIndex((i) => Math.max(0, (i as number) - 1))}
              disabled={stepIndex === 0}
              className="p-0.5 rounded text-ctp-overlay1 hover:text-ctp-subtext1 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="text-[10px] text-ctp-subtext0 tabular-nums">
              Scan {currentScanRound} · Step {(stepIndex as number) + 1} of {steps.length}
            </span>
            <button
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, (i as number) + 1))}
              disabled={stepIndex === steps.length - 1}
              className="p-0.5 rounded text-ctp-overlay1 hover:text-ctp-subtext1 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={12} />
            </button>
          </>
        )}
        <button
          onClick={() => setStepIndex(stepIndex === 'all' ? 0 : 'all')}
          className="ml-auto text-[10px] text-ctp-accent hover:text-ctp-blue transition-colors"
        >
          {stepIndex === 'all' ? 'Step view' : 'Grouped'}
        </button>
      </div>

      {/* Step view */}
      {stepIndex !== 'all' && (
        <StepDetail step={steps[stepIndex as number]} entries={entries} />
      )}

      {/* Grouped view */}
      {stepIndex === 'all' && (
        <GroupedView steps={steps} entries={entries} />
      )}
    </div>
  )
}

function GroupedView({ steps, entries }: { steps: RecursionStep[]; entries: WorkingEntry[] }) {
  const scanGroups = steps.reduce<Map<number, RecursionStep[]>>((acc, step) => {
    const group = acc.get(step.step) ?? []
    group.push(step)
    acc.set(step.step, group)
    return acc
  }, new Map())

  return (
    <div className="flex flex-col gap-3 px-3">
      {Array.from(scanGroups.entries()).map(([scanIndex, scanSteps]) => (
        <div key={scanIndex}>
          <p className="text-[10px] text-ctp-subtext0 font-semibold mb-1">
            Scan {scanIndex + 1}
          </p>
          <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-ctp-surface1">
            {scanSteps.map((step, i) => (
              <div key={i}>
                <p className="text-[10px] text-ctp-mauve">
                  {i + 1}. {entryName(entries, step.scannedEntryId)}
                  {step.triggeredByEntryId && (
                    <span className="text-ctp-overlay1 italic ml-1">
                      (From {entryName(entries, step.triggeredByEntryId)})
                    </span>
                  )}
                </p>
                <div className="pl-3">
                  {step.activatedEntryIds.map((id) => (
                    <p key={id} className="text-[10px]">
                      <span className="text-ctp-text">→ </span>
                      <span className="text-ctp-green">{entryName(entries, id)}</span>
                      {' '}
                      <span className="text-ctp-overlay1">
                        ({step.matchDetails.filter((m) => m.entryId === id).map((m) => m.keyword).join(', ')})
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StepDetail({ step, entries }: { step: RecursionStep; entries: WorkingEntry[] }) {
  return (
    <div className="px-3 space-y-1.5">
      <p className="text-[10px] text-ctp-subtext0">
        Scanned:{' '}
        <span className="text-ctp-mauve font-medium">{entryName(entries, step.scannedEntryId)}</span>
      </p>
      {step.activatedEntryIds.length === 0 ? (
        <p className="text-[10px] text-ctp-overlay1">No entries triggered.</p>
      ) : (
        <div className="space-y-1">
          {step.activatedEntryIds.map((id) => {
            const keywords = step.matchDetails.filter((m) => m.entryId === id).map((m) => m.keyword)
            return (
              <div key={id} className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-ctp-overlay1">→</span>
                <div>
                  <span className="text-[10px] text-ctp-green font-medium">{entryName(entries, id)}</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {keywords.map((kw, i) => (
                      <span key={i} className="text-[9px] bg-ctp-surface1 text-ctp-subtext0 rounded px-1 py-px">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
