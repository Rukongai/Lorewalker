import type { WorkingEntry, SelectiveLogic } from '@/types'
import { KeywordInput } from '@/components/editor/KeywordInput'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { Field, inputClass } from '@/features/editor/primitives'

type InsertionStrategy = 'constant' | 'normal' | 'vectorized'

// isSillyTavern reserved for future ST-specific activation options

interface ActivationFieldsProps {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function ActivationFields({ entry, onChange }: ActivationFieldsProps) {
  const strategy: InsertionStrategy = entry.constant ? 'constant' : entry.vectorized ? 'vectorized' : 'normal'

  const strategyActiveClass: Record<InsertionStrategy, string> = {
    constant:   'bg-ctp-mauve/40 text-ctp-mauve font-medium',
    normal:     'bg-ctp-sky/40 text-ctp-sky font-medium',
    vectorized: 'bg-ctp-sapphire/40 text-ctp-sapphire font-medium',
  }
  const strategyInactiveClass = 'bg-ctp-surface0 text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface1'

  function handleStrategyChange(s: InsertionStrategy) {
    if (s === 'constant') onChange({ constant: true, vectorized: false })
    else if (s === 'vectorized') onChange({ constant: false, vectorized: true })
    else onChange({ constant: false, vectorized: false })
  }

  function handleSecondaryKeysChange(secondaryKeys: string[]) {
    const patch: Partial<WorkingEntry> = { secondaryKeys }
    if (secondaryKeys.length === 0) patch.selective = false
    onChange(patch)
  }

  return (
    <>
      <Field
        label="Insertion Strategy"
        help="Controls how this entry activates. Constant = always active; Normal = keyword-triggered; Vectorized = semantic similarity search."
      >
        <div className="flex rounded border border-ctp-surface1 overflow-hidden">
          {(['constant', 'normal', 'vectorized'] as InsertionStrategy[]).map((s) => (
            <button
              key={s}
              onClick={() => handleStrategyChange(s)}
              className={`flex-1 px-2 py-1 text-xs capitalize transition-colors ${strategy === s ? strategyActiveClass[s] : strategyInactiveClass}`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>
      <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
        <Toggle checked={entry.selective} onChange={(val) => onChange({ selective: val })} />
        Selective (requires secondary key match)
        <HelpTooltip text="When checked, the entry only activates if secondary keys also match according to the Selective Logic rule." />
      </label>
      <Field label="Keys" help="Primary trigger keywords. When any key appears in the scan window, this entry may activate. Supports plain text or /regex/ patterns.">
        <KeywordInput
          value={entry.keys}
          onChange={(keys) => onChange({ keys })}
          placeholder="keyword, keyword…"
        />
      </Field>
      {entry.selective && (
        <>
          <Field label="Selective Logic" help="How secondary keys interact with primary keys: AND ANY (any secondary matches), AND ALL (all must match), NOT ANY (blocks if any secondary matches), NOT ALL (blocks only if all match).">
            <select
              value={entry.selectiveLogic}
              onChange={(e) => onChange({ selectiveLogic: Number(e.target.value) as SelectiveLogic })}
              className={inputClass}
            >
              <option value={0}>AND ANY (primary + any secondary)</option>
              <option value={1}>AND ALL (primary + all secondary)</option>
              <option value={2}>NOT ANY (primary + none of secondary)</option>
              <option value={3}>NOT ALL (primary, not all secondary)</option>
            </select>
          </Field>
          <Field label="Secondary Keys (Optional Filter)" help="Additional keywords evaluated after a primary key match. Activation depends on the Selective Logic setting.">
            <KeywordInput
              variant="secondary"
              value={entry.secondaryKeys}
              onChange={handleSecondaryKeysChange}
              placeholder="secondary, secondary…"
            />
          </Field>
        </>
      )}
    </>
  )
}
