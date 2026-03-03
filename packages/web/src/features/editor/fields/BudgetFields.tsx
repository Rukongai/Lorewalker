import type { WorkingEntry } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { Field } from '@/features/editor/primitives'

interface BudgetFieldsProps {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function BudgetFields({ entry, onChange }: BudgetFieldsProps) {
  return (
    <>
      <Field label="Token Count" help="Estimated token count of this entry's content, computed on import. Reduce content length to lower token usage.">
        <p className="px-2 py-1.5 text-xs text-ctp-subtext1">{entry.tokenCount} tokens</p>
      </Field>
      <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
        <Toggle checked={entry.ignoreBudget} onChange={(val) => onChange({ ignoreBudget: val })} />
        Ignore Budget
        <HelpTooltip text="Entry bypasses the token budget limit, ensuring it's always inserted regardless of how much context is used. Use sparingly for critical lore." />
      </label>
    </>
  )
}
