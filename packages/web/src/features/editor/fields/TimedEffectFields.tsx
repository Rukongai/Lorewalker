import type { WorkingEntry } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { FieldGroup, Field, inputClass } from '@/features/editor/primitives'

interface TimedEffectFieldsProps {
  entry: WorkingEntry
  isSillyTavern: boolean
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function TimedEffectFields({ entry, isSillyTavern, onChange }: TimedEffectFieldsProps) {
  function handleProbabilityChange(value: number) {
    onChange({ probability: value, useProbability: value < 100 })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Trigger %" help="Probability (1–100) that the entry is inserted when its keys match. Set below 100 to add randomness. Probability is enabled automatically when below 100.">
          <input
            type="number"
            min={1}
            max={100}
            value={entry.probability}
            onChange={(e) => handleProbabilityChange(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Delay" help="Minimum number of messages that must exist in the chat before this entry can activate. Leave empty to use the global default.">
          <input
            type="number"
            min={0}
            value={entry.delay ?? ''}
            placeholder="Global default"
            onChange={(e) => onChange({ delay: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputClass}
          />
        </Field>
        <Field label="Cooldown Duration" help="After this entry activates, it cannot activate again for this many messages. Leave empty to use the global default.">
          <input
            type="number"
            min={0}
            value={entry.cooldown ?? ''}
            placeholder="Global default"
            onChange={(e) => onChange({ cooldown: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputClass}
          />
        </Field>
        <Field label="Sticky Duration" help="After activating, the entry stays injected for this many additional messages without needing keyword triggers. Leave empty to use the global default.">
          <input
            type="number"
            min={0}
            value={entry.sticky ?? ''}
            placeholder="Global default"
            onChange={(e) => onChange({ sticky: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputClass}
          />
        </Field>
      </div>
      {isSillyTavern && (
        <FieldGroup label="Use Probability" stOnly>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.useProbability} onChange={(val) => onChange({ useProbability: val })} />
            Enable Trigger %
            <HelpTooltip text="When off, the Trigger % field is ignored and the entry always activates on keyword match." />
          </label>
        </FieldGroup>
      )}
    </>
  )
}
