import type { WorkingEntry } from '@/types'
import { KeywordInput } from '@/components/editor/KeywordInput'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { Field } from '@/features/editor/primitives'

interface CharFilterFieldsProps {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function CharFilterFields({ entry, onChange }: CharFilterFieldsProps) {
  return (
    <>
      <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
        <Toggle
          checked={entry.characterFilter.isExclude}
          onChange={(val) => onChange({ characterFilter: { ...entry.characterFilter, isExclude: val } })}
        />
        Exclude (block listed characters instead of allow)
        <HelpTooltip text="When checked, the character list becomes a blocklist — the entry activates for all characters except those named." />
      </label>
      <Field label="Character Names" help="Characters this filter applies to. In allowlist mode, only these characters can trigger the entry; in exclude mode, these characters are blocked.">
        <KeywordInput
          value={entry.characterFilter.names}
          onChange={(names) => onChange({ characterFilter: { ...entry.characterFilter, names } })}
          placeholder="CharacterName…"
        />
      </Field>
      <Field label="Character Tags" help="Filter by character tags instead of names. Works alongside the character names list.">
        <KeywordInput
          variant="secondary"
          value={entry.characterFilter.tags}
          onChange={(tags) => onChange({ characterFilter: { ...entry.characterFilter, tags } })}
          placeholder="tag…"
        />
      </Field>
    </>
  )
}
