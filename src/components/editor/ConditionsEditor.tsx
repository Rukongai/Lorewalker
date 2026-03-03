import { X } from 'lucide-react'
import type { RoleCallCondition, RoleCallConditionType } from '@/types'

const CONDITION_TYPE_OPTIONS: { value: RoleCallConditionType; label: string }[] = [
  { value: 'emotion', label: 'Emotion' },
  { value: 'messageCount', label: 'Msg Count' },
  { value: 'randomChance', label: 'Random %' },
  { value: 'isGroupChat', label: 'Group Chat' },
  { value: 'generationType', label: 'Gen Type' },
  { value: 'swipeCount', label: 'Swipe Count' },
  { value: 'lorebookActive', label: 'Entry Active' },
  { value: 'recency', label: 'Recency' },
]

const BOOLEAN_TYPES = new Set<RoleCallConditionType>(['isGroupChat'])
const NUMBER_TYPES = new Set<RoleCallConditionType>(['randomChance', 'messageCount', 'swipeCount', 'recency'])

interface ConditionsEditorProps {
  conditions: RoleCallCondition[]
  onChange: (conditions: RoleCallCondition[]) => void
}

export function ConditionsEditor({ conditions, onChange }: ConditionsEditorProps) {
  function updateCondition(index: number, patch: Partial<RoleCallCondition>) {
    const next = conditions.map((c, i) => i === index ? { ...c, ...patch } : c)
    onChange(next)
  }

  function removeCondition(index: number) {
    onChange(conditions.filter((_, i) => i !== index))
  }

  function addCondition() {
    onChange([...conditions, { type: 'emotion', value: '', frequency: 1 }])
  }

  return (
    <div className="flex flex-col gap-1">
      {conditions.length > 0 && (
        <div className="grid gap-1" style={{ gridTemplateColumns: '120px 1fr 56px auto' }}>
          <span className="text-[10px] text-ctp-subtext0 px-1">Type</span>
          <span className="text-[10px] text-ctp-subtext0 px-1">Value</span>
          <span className="text-[10px] text-ctp-subtext0 text-center">Cooldown</span>
          <span className="w-6" />
          {conditions.map((cond, i) => (
            <ConditionRow
              key={i}
              condition={cond}
              onChange={(patch) => updateCondition(i, patch)}
              onRemove={() => removeCondition(i)}
            />
          ))}
        </div>
      )}
      <button
        onClick={addCondition}
        className="self-start text-[11px] text-ctp-blue hover:text-ctp-sapphire transition-colors px-1 py-0.5"
      >
        + Add Condition
      </button>
    </div>
  )
}

function ConditionRow({ condition, onChange, onRemove }: {
  condition: RoleCallCondition
  onChange: (patch: Partial<RoleCallCondition>) => void
  onRemove: () => void
}) {
  function handleTypeChange(newType: RoleCallConditionType) {
    // Reset value to appropriate default when type changes
    let defaultValue: string | boolean | number = ''
    if (BOOLEAN_TYPES.has(newType)) defaultValue = false
    else if (NUMBER_TYPES.has(newType)) defaultValue = 0
    onChange({ type: newType, value: defaultValue })
  }

  return (
    <>
      <select
        value={condition.type}
        onChange={(e) => handleTypeChange(e.target.value as RoleCallConditionType)}
        className="w-full px-2 py-0.5 rounded text-[11px] bg-ctp-surface0 border border-ctp-surface2 text-ctp-text focus:outline-none focus:border-ctp-blue"
      >
        {CONDITION_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ConditionValueInput condition={condition} onChange={onChange} />
      <input
        type="number"
        min={0}
        value={condition.frequency ?? 1}
        onChange={(e) => onChange({ frequency: Math.max(0, Number(e.target.value)) })}
        className="w-full px-1 py-0.5 rounded text-[11px] bg-ctp-surface0 border border-ctp-surface2 text-ctp-text text-center focus:outline-none focus:border-ctp-blue"
      />
      <button
        onClick={onRemove}
        className="flex items-center justify-center w-6 h-6 rounded text-ctp-overlay1 hover:text-ctp-red hover:bg-ctp-red/10 transition-colors"
        title="Remove"
      >
        <X size={12} />
      </button>
    </>
  )
}

function ConditionValueInput({ condition, onChange }: {
  condition: RoleCallCondition
  onChange: (patch: Partial<RoleCallCondition>) => void
}) {
  if (BOOLEAN_TYPES.has(condition.type)) {
    return (
      <div className="flex items-center px-2">
        <input
          type="checkbox"
          checked={condition.value === true}
          onChange={(e) => onChange({ value: e.target.checked })}
          className="w-3.5 h-3.5 accent-ctp-blue"
        />
      </div>
    )
  }

  if (NUMBER_TYPES.has(condition.type)) {
    return (
      <input
        type="number"
        min={0}
        value={typeof condition.value === 'number' ? condition.value : 0}
        onChange={(e) => onChange({ value: Math.max(0, Number(e.target.value)) })}
        className="w-full px-2 py-0.5 rounded text-[11px] bg-ctp-surface0 border border-ctp-surface2 text-ctp-text focus:outline-none focus:border-ctp-blue"
      />
    )
  }

  return (
    <input
      type="text"
      value={typeof condition.value === 'string' ? condition.value : String(condition.value)}
      onChange={(e) => onChange({ value: e.target.value })}
      placeholder="value"
      className="w-full px-2 py-0.5 rounded text-[11px] bg-ctp-surface0 border border-ctp-surface2 text-ctp-text placeholder:text-ctp-overlay0 focus:outline-none focus:border-ctp-blue"
    />
  )
}
