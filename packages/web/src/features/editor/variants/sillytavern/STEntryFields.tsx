import type { WorkingEntry } from '@/types'
import { FieldGroup } from '@/features/editor/primitives'
import { TriggersFields } from '@/features/editor/fields/TriggersFields'

interface STEntryFieldsProps {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function STEntryFields({ entry, onChange }: STEntryFieldsProps) {
  return (
    <FieldGroup label="Triggers" stOnly defaultCollapsed>
      <TriggersFields
        triggers={entry.triggers}
        onChange={(triggers) => onChange({ triggers })}
      />
    </FieldGroup>
  )
}
