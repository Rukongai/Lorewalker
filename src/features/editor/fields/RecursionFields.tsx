import type { WorkingEntry } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { inputClass } from '@/features/editor/primitives'

interface RecursionFieldsProps {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function RecursionFields({ entry, onChange }: RecursionFieldsProps) {
  return (
    <>
      <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
        <Toggle checked={entry.preventRecursion} onChange={(val) => onChange({ preventRecursion: val })} />
        Prevent Further Recursion
        <HelpTooltip text="When active, this entry won't trigger other entries through recursion. Stops unintended cascading activation chains." />
      </label>
      <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
        <Toggle checked={entry.excludeRecursion} onChange={(val) => onChange({ excludeRecursion: val })} />
        Non-recursable
        <HelpTooltip text="This entry can only be activated by direct keyword matches in chat. Other entries cannot recursively trigger it." />
      </label>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0 shrink-0">
          <Toggle
            checked={entry.delayUntilRecursion > 0}
            onChange={(val) => onChange({ delayUntilRecursion: val ? 1 : 0 })}
          />
          Delay Until Recursion
          <HelpTooltip text="The entry stays inactive for this many recursion passes before it can be triggered by other entries." />
        </label>
        {entry.delayUntilRecursion > 0 && (
          <input
            type="number"
            min={1}
            value={entry.delayUntilRecursion}
            onChange={(e) => onChange({ delayUntilRecursion: Number(e.target.value) })}
            className={`${inputClass} w-16`}
          />
        )}
      </div>
    </>
  )
}
