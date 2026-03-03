import { useState } from 'react'
import type { WorkingEntry, ActivationResult, BookMeta } from '@/types'
import { simulate } from '@lorewalker/core'
import { ActivationResultList } from '@/features/simulator/ActivationResultList'

export interface EntrySimulationProps {
  entry: WorkingEntry
  entries: WorkingEntry[]
  bookMeta: BookMeta
  onOpenEntry?: (id: string) => void
}

export function EntrySimulation({ entry, entries, bookMeta, onOpenEntry }: EntrySimulationProps) {
  const [result, setResult] = useState<ActivationResult | null>(null)

  function handleSimulate() {
    const context = {
      messages: [{ role: 'user' as const, content: entry.content }],
      scanDepth: bookMeta.scanDepth,
      tokenBudget: bookMeta.tokenBudget,
      caseSensitive: bookMeta.caseSensitive,
      matchWholeWords: bookMeta.matchWholeWords,
      maxRecursionSteps: bookMeta.maxRecursionSteps,
      includeNames: false,
    }
    setResult(simulate(entries, context))
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleSimulate}
        className="self-start px-3 py-1.5 text-xs bg-ctp-surface1 hover:bg-ctp-surface2 text-ctp-text rounded transition-colors"
      >
        Simulate this entry
      </button>
      <ActivationResultList
        result={result}
        entries={entries}
        onSelectEntry={() => {}}
        onOpenEntry={onOpenEntry}
        compact={false}
      />
    </div>
  )
}
