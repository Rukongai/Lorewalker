import type { WorkingEntry, EntryPosition, RoleCallPosition } from '@/types'
import { RoleCallPositionSelect } from '@/components/editor/RoleCallPositionSelect'
import { Field, inputClass } from '@/features/editor/primitives'

interface PriorityFieldsProps {
  entry: WorkingEntry
  isRoleCall: boolean
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function PriorityFields({ entry, isRoleCall, onChange }: PriorityFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Position" help={isRoleCall ? "RoleCall injection position. World/Character inject near character context; Scene injects near recent messages; @ Depth injects at an exact chat depth." : "Where the entry's content is injected in the final prompt."}>
          {isRoleCall ? (
            <RoleCallPositionSelect
              value={entry.positionRoleCall ?? 'depth'}
              onChange={(pos: RoleCallPosition) => onChange({ positionRoleCall: pos })}
            />
          ) : (
            <select
              value={entry.position}
              onChange={(e) => onChange({ position: Number(e.target.value) as EntryPosition })}
              className={inputClass}
            >
              <option value={0}>0 — Before Char Defs</option>
              <option value={1}>1 — After Char Defs</option>
              <option value={2}>2 — Before Examples</option>
              <option value={3}>3 — After Examples</option>
              <option value={4}>4 — @ Depth</option>
              <option value={5}>5 — Top of AN</option>
              <option value={6}>6 — Bottom of AN</option>
              <option value={7}>7 — Outlet</option>
            </select>
          )}
        </Field>
        <Field label="Order" help="Priority when multiple entries activate simultaneously. Higher values place entries closer to the end of the prompt, giving them more influence.">
          <input
            type="number"
            value={entry.order}
            onChange={(e) => onChange({ order: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>
      </div>
      {(isRoleCall ? entry.positionRoleCall === 'depth' : entry.position === 4) && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Role" help="Whether this entry is injected as a system, user, or assistant message.">
            <select
              value={entry.role}
              onChange={(e) => onChange({ role: Number(e.target.value) })}
              className={inputClass}
            >
              <option value={0}>System</option>
              <option value={1}>User</option>
              <option value={2}>Assistant</option>
            </select>
          </Field>
          <Field label="Context Depth" help="Chat depth at which this entry is injected. Depth 0 = bottom of the prompt (most recent); higher values insert further up in the conversation history.">
            <input
              type="number"
              value={entry.depth}
              onChange={(e) => onChange({ depth: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
        </div>
      )}
      {entry.position === 7 && (
        <Field label="Outlet Name" help="The named outlet this entry's content is stored under. Reference it in your prompt template with {{outlet::Name}}.">
          <input
            type="text"
            value={entry.outletName}
            onChange={(e) => onChange({ outletName: e.target.value })}
            className={inputClass}
            placeholder="Outlet name"
          />
        </Field>
      )}
    </>
  )
}
