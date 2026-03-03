import type { ActivationResult, WorkingEntry } from '@/types'
import { ActivationResultList } from '@/features/simulator/ActivationResultList'

interface ActivationResultsProps {
  result: ActivationResult
  entries: WorkingEntry[]
  onSelectEntry: (entryId: string) => void
}

export function ActivationResults({ result, entries, onSelectEntry }: ActivationResultsProps) {
  return (
    <ActivationResultList
      result={result}
      entries={entries}
      onSelectEntry={onSelectEntry}
      compact
    />
  )
}
