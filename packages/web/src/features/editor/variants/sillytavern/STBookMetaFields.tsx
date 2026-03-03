import type { BookMeta } from '@/types'
import { FieldGroup, Field, inputClass } from '@/features/editor/primitives'
import { Toggle } from '@/components/shared/Toggle'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

interface STBookMetaFieldsProps {
  bookMeta: BookMeta
  onChange: <K extends keyof BookMeta>(field: K, value: BookMeta[K]) => void
}

export function STBookMetaFields({ bookMeta, onChange }: STBookMetaFieldsProps) {
  return (
    <>
      <FieldGroup label="Budget (ST)" stOnly defaultCollapsed>
        <Field label="Budget Cap" help="Hard maximum token count for all lorebook content combined, regardless of the percentage setting. Set to 0 for no hard cap.">
          <input
            type="number"
            min={0}
            value={bookMeta.budgetCap}
            onChange={(e) => onChange('budgetCap', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={bookMeta.alertOnOverflow} onChange={(val) => onChange('alertOnOverflow', val)} />
          Alert on Overflow
          <HelpTooltip text="Triggers a warning when lorebook content exceeds the configured token budget." />
        </label>
        <Field label="Insertion Strategy" help="Determines which lorebook entries get priority when competing for limited context space. 'Sorted Evenly' interleaves character and global lore; the others front-load one type.">
          <select
            value={bookMeta.insertionStrategy}
            onChange={(e) => onChange('insertionStrategy', e.target.value as 'evenly' | 'character_lore_first' | 'global_lore_first')}
            className={inputClass}
          >
            <option value="evenly">Sorted Evenly</option>
            <option value="character_lore_first">Character Lore First</option>
            <option value="global_lore_first">Global Lore First</option>
          </select>
        </Field>
      </FieldGroup>

      <FieldGroup label="Activation (ST)" stOnly defaultCollapsed>
        <Field label="Max Recursion Steps" help="Caps how many recursive scan passes occur per generation. Set to 0 for unlimited recursion (not recommended).">
          <input
            type="number"
            min={0}
            value={bookMeta.maxRecursionSteps}
            onChange={(e) => onChange('maxRecursionSteps', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Min Activations" help="Forces at least this many entries to activate even with no keyword matches, scanning progressively older messages as needed. Set to 0 to disable.">
          <input
            type="number"
            min={0}
            value={bookMeta.minActivations}
            onChange={(e) => onChange('minActivations', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Max Depth" help="How far back in chat history Min Activations is allowed to scan. Set to 0 for unlimited depth.">
          <input
            type="number"
            min={0}
            value={bookMeta.maxDepth}
            onChange={(e) => onChange('maxDepth', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={bookMeta.includeNames} onChange={(val) => onChange('includeNames', val)} />
          Include Names
          <HelpTooltip text="Also scans message author names (user/character) for trigger keywords." />
        </label>
      </FieldGroup>

      <FieldGroup label="Groups (ST)" stOnly defaultCollapsed>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={bookMeta.useGroupScoring} onChange={(val) => onChange('useGroupScoring', val)} />
          Use Group Scoring
          <HelpTooltip text="Global default for how entries compete within inclusion groups. When on, the entry with the most keyword matches wins; when off, entries are chosen by random weight rolling. Individual entries can override this setting." />
        </label>
      </FieldGroup>
    </>
  )
}
