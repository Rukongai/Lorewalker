import type { RoleCallPosition } from '@/types'

const inputClass =
  'w-full bg-ctp-surface0 border border-ctp-surface2 rounded px-2 py-1.5 text-xs text-ctp-subtext1 outline-none focus:border-ctp-accent transition-colors'

interface RoleCallPositionSelectProps {
  value: RoleCallPosition
  onChange: (pos: RoleCallPosition) => void
}

export function RoleCallPositionSelect({ value, onChange }: RoleCallPositionSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RoleCallPosition)}
      className={inputClass}
    >
      <option value="world">World — global lore, early injection</option>
      <option value="character">Character — near character definitions</option>
      <option value="scene">Scene — near recent messages</option>
      <option value="depth">@ Depth — exact depth + role</option>
    </select>
  )
}
