import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { WorkingEntry, RecursionGraph } from '@/types'
import { getReachableEntries } from '@/services/graph-service'

export interface ReachAnalysisProps {
  entry: WorkingEntry
  entries: WorkingEntry[]
  graph: RecursionGraph
  maxRecursionSteps: number
  onEntrySelect?: (entryId: string) => void
}

interface ReachStep {
  step: number
  entryIds: string[]
}

function computeSteps(entryId: string, graph: RecursionGraph, maxRecursionSteps: number): ReachStep[] {
  const cap = maxRecursionSteps === 0 ? 10 : maxRecursionSteps
  const steps: ReachStep[] = []

  for (let step = 1; step <= cap; step++) {
    const reachableAtStep = getReachableEntries(entryId, graph, step)
    const reachableAtPrev = step === 1 ? new Set<string>() : getReachableEntries(entryId, graph, step - 1)
    const newAtStep = [...reachableAtStep].filter((id) => !reachableAtPrev.has(id))

    if (newAtStep.length === 0) break
    steps.push({ step, entryIds: newAtStep })
  }

  return steps
}

export function ReachAnalysis({ entry, entries, graph, maxRecursionSteps, onEntrySelect }: ReachAnalysisProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]))

  const outgoing = graph.edges.get(entry.id)
  const steps = (outgoing && outgoing.size > 0)
    ? computeSteps(entry.id, graph, maxRecursionSteps)
    : []

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-6">
        <p className="text-sm text-ctp-overlay1 text-center px-4">
          This entry triggers no other entries.
        </p>
      </div>
    )
  }

  function toggleStep(step: number) {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(step)) {
        next.delete(step)
      } else {
        next.add(step)
      }
      return next
    })
  }

  function resolveName(id: string): string {
    return entries.find((e) => e.id === id)?.name ?? id
  }

  return (
    <div className="flex flex-col gap-0.5">
      {steps.map(({ step, entryIds }) => {
        const isOpen = expandedSteps.has(step)
        return (
          <div key={step}>
            <button
              onClick={() => toggleStep(step)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-left hover:bg-ctp-surface0 rounded transition-colors"
            >
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span className="text-xs text-ctp-subtext0 font-medium">
                Step {step}
              </span>
              <span className="text-[10px] text-ctp-overlay1 ml-1">
                — {entryIds.length} {entryIds.length === 1 ? 'entry' : 'entries'}
              </span>
            </button>
            {isOpen && (
              <div className="flex flex-col gap-0.5 pl-5 pb-1">
                {entryIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => onEntrySelect?.(id)}
                    className="text-left text-xs text-ctp-text hover:text-ctp-accent hover:bg-ctp-surface0 rounded px-1.5 py-0.5 transition-colors"
                  >
                    {resolveName(id)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
