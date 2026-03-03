import type { WorkingEntry } from '@/types'
import { Field, inputClass } from '@/features/editor/primitives'

interface ScanOverrideFieldsProps {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function ScanOverrideFields({ entry, onChange }: ScanOverrideFieldsProps) {
  return (
    <>
      <Field label="Scan Depth (empty = book default)" help="Overrides the book-level scan depth for this entry only. Leave blank to inherit the book default.">
        <input
          type="number"
          placeholder="Default"
          value={entry.scanDepth ?? ''}
          onChange={(e) => onChange({ scanDepth: e.target.value === '' ? null : Number(e.target.value) })}
          className={inputClass}
        />
      </Field>
      <Field label="Case Sensitive" help="When enabled, keyword matching is case-sensitive ('King' won't match 'king'). Overrides the book-level default.">
        <select
          value={entry.caseSensitive === null ? '' : String(entry.caseSensitive)}
          onChange={(e) => onChange({ caseSensitive: e.target.value === '' ? null : e.target.value === 'true' })}
          className={inputClass}
        >
          <option value="">Default (book setting)</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </Field>
      <Field label="Match Whole Words" help="When enabled, keywords only match complete words ('king' won't match 'liking'). Overrides the book-level default.">
        <select
          value={entry.matchWholeWords === null ? '' : String(entry.matchWholeWords)}
          onChange={(e) => onChange({ matchWholeWords: e.target.value === '' ? null : e.target.value === 'true' })}
          className={inputClass}
        >
          <option value="">Default (book setting)</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </Field>
    </>
  )
}
