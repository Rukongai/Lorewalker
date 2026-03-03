import type { WorkingEntry } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { FieldGroup, Field, inputClass } from '@/features/editor/primitives'

interface GroupFieldsProps {
  entry: WorkingEntry
  isSillyTavern: boolean
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function GroupFields({ entry, isSillyTavern, onChange }: GroupFieldsProps) {
  return (
    <>
      <Field label="Inclusion Group" help="A shared label for mutually exclusive entries. When multiple entries in the same group activate, only one is inserted. Leave blank for independent entries.">
        <input
          type="text"
          value={entry.group}
          onChange={(e) => onChange({ group: e.target.value })}
          className={inputClass}
          placeholder="Group name"
        />
      </Field>
      <Field label="Group Weight" help="Relative likelihood of this entry being selected when competing within an inclusion group. Higher values increase selection probability.">
        <input
          type="number"
          min={0}
          value={entry.groupWeight}
          onChange={(e) => onChange({ groupWeight: Number(e.target.value) })}
          className={inputClass}
        />
      </Field>
      {isSillyTavern && (
        <FieldGroup label="Group Scoring" stOnly>
          <Field label="Use Group Scoring" help="When enabled, the entry with the most matching keys wins the group instead of random weight rolling. Default inherits the book-level setting.">
            <select
              value={entry.useGroupScoring === null ? '' : String(entry.useGroupScoring)}
              onChange={(e) => onChange({ useGroupScoring: e.target.value === '' ? null : e.target.value === 'true' })}
              className={inputClass}
            >
              <option value="">Default</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.groupOverride} onChange={(val) => onChange({ groupOverride: val })} />
            Prioritize Inclusion
            <HelpTooltip text="Forces deterministic selection — picks the entry with the highest Insertion Order instead of random weight rolling." />
          </label>
        </FieldGroup>
      )}
    </>
  )
}
