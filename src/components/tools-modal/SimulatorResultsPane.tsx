import type { ActivationResult, WorkingEntry } from '@/types'
import { ActivationResultList } from '@/features/simulator/ActivationResultList'

interface SimulatorResultsPaneProps {
  result: ActivationResult | null
  entries: WorkingEntry[]
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
}

export function SimulatorResultsPane({
  result,
  entries,
  onOpenEntry,
  onSelectEntry,
}: SimulatorResultsPaneProps) {
  return (
    <ActivationResultList
      result={result}
      entries={entries}
      onSelectEntry={onSelectEntry}
      onOpenEntry={onOpenEntry}
    />
  )
}
