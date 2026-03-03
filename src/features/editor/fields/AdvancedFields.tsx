import type { WorkingEntry } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { Field, inputClass } from '@/features/editor/primitives'

interface AdvancedFieldsProps {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function AdvancedFields({ entry, onChange }: AdvancedFieldsProps) {
  return (
    <>
      <Field label="Automation ID" help="Connects this entry to an STscript in Quick Replies. When the entry activates, the matching script runs automatically.">
        <input
          type="text"
          value={entry.automationId}
          onChange={(e) => onChange({ automationId: e.target.value })}
          className={inputClass}
          placeholder="Automation ID"
        />
      </Field>
      <Field label="Display Index" help="Controls the visual sort order of this entry in SillyTavern's World Info editor. Does not affect activation or injection.">
        <input
          type="number"
          value={entry.displayIndex ?? ''}
          onChange={(e) => onChange({ displayIndex: e.target.value === '' ? null : Number(e.target.value) })}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
        <Toggle checked={entry.ignoreBudget} onChange={(val) => onChange({ ignoreBudget: val })} />
        Ignore Budget
        <HelpTooltip text="Entry bypasses the token budget limit, ensuring it's always inserted regardless of how much context is used. Use sparingly for critical lore." />
      </label>
    </>
  )
}
