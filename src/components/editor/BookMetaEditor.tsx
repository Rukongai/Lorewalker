import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import type { BookMeta } from '@/types'

function FieldGroup({ label, defaultCollapsed = false, children }: {
  label: string
  defaultCollapsed?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!defaultCollapsed)
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left text-[10px] font-semibold tracking-wider text-gray-500 px-3 pt-2 pb-1 flex items-center gap-1.5 hover:text-gray-400 transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {label}
      </button>
      {open && <div className="px-3 space-y-2 pb-2">{children}</div>}
    </div>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 flex items-center">
        {label}
        {help && <HelpTooltip text={help} />}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-indigo-500 transition-colors'

export function BookMetaEditor() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const bookMeta = activeStore((s) => s.bookMeta)

  const handleChange = useCallback(
    <K extends keyof BookMeta>(field: K, value: BookMeta[K]) => {
      if (!realStore) return
      realStore.getState().updateBookMeta({ [field]: value })
      if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
    },
    [realStore, activeTabId]
  )

  if (!activeTabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-gray-500">No book open</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto text-sm">
      {/* Book Info */}
      <FieldGroup label="Book Info">
        <Field label="Name" help="The display name of this lorebook. Used as a label in the editor only — not injected into the AI's context.">
          <input
            type="text"
            value={bookMeta.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
            placeholder="Lorebook name"
          />
        </Field>
        <Field label="Description" help="A brief summary of this lorebook's purpose or content. Shown in the editor only.">
          <textarea
            value={bookMeta.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className={`${inputClass} min-h-[60px] resize-y`}
            placeholder="Lorebook description"
          />
        </Field>
      </FieldGroup>

      {/* Scanning */}
      <FieldGroup label="Scanning">
        <Field label="Scan Depth" help="How many messages back in chat history to scan for keyword triggers. Higher values catch older context but cost more processing time.">
          <input
            type="number"
            min={0}
            value={bookMeta.scanDepth}
            onChange={(e) => handleChange('scanDepth', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <Toggle checked={bookMeta.includeNames} onChange={(val) => handleChange('includeNames', val)} />
          Include Names
          <HelpTooltip text="Also scans message author names (user/character) for trigger keywords." />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <Toggle checked={bookMeta.caseSensitive} onChange={(val) => handleChange('caseSensitive', val)} />
          Case-sensitive Keys
          <HelpTooltip text="When on, keywords must match exact letter casing ('Dragon' won't match 'dragon'). Off by default." />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <Toggle checked={bookMeta.matchWholeWords} onChange={(val) => handleChange('matchWholeWords', val)} />
          Match Whole Words
          <HelpTooltip text="When on, keywords only match complete words ('ring' won't match 'spring'). Off by default." />
        </label>
      </FieldGroup>

      {/* Budget */}
      <FieldGroup label="Budget" defaultCollapsed>
        <Field label="Context %" help="Percentage of the total context window reserved for World Info entries. Controls how much lore can be injected before the budget is exhausted.">
          <input
            type="number"
            min={0}
            value={bookMeta.tokenBudget}
            onChange={(e) => handleChange('tokenBudget', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Budget Cap" help="Hard maximum token count for all lorebook content combined, regardless of the percentage setting. Set to 0 for no hard cap.">
          <input
            type="number"
            min={0}
            value={bookMeta.budgetCap}
            onChange={(e) => handleChange('budgetCap', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <Toggle checked={bookMeta.alertOnOverflow} onChange={(val) => handleChange('alertOnOverflow', val)} />
          Alert on Overflow
          <HelpTooltip text="Triggers a warning when lorebook content exceeds the configured token budget." />
        </label>
        <Field label="Insertion Strategy" help="Determines which lorebook entries get priority when competing for limited context space. 'Sorted Evenly' interleaves character and global lore; the others front-load one type.">
          <select
            value={bookMeta.insertionStrategy}
            onChange={(e) => handleChange('insertionStrategy', e.target.value as 'evenly' | 'character_lore_first' | 'global_lore_first')}
            className={inputClass}
          >
            <option value="evenly">Sorted Evenly</option>
            <option value="character_lore_first">Character Lore First</option>
            <option value="global_lore_first">Global Lore First</option>
          </select>
        </Field>
      </FieldGroup>

      {/* Activation */}
      <FieldGroup label="Activation" defaultCollapsed>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <Toggle checked={bookMeta.recursiveScan} onChange={(val) => handleChange('recursiveScan', val)} />
          Recursive Scan
          <HelpTooltip text="When on, newly activated entries are also scanned for keywords, allowing chains of entries to activate each other." />
        </label>
        <Field label="Max Recursion Steps" help="Caps how many recursive scan passes occur per generation. Set to 0 for unlimited recursion (not recommended).">
          <input
            type="number"
            min={0}
            value={bookMeta.maxRecursionSteps}
            onChange={(e) => handleChange('maxRecursionSteps', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Min Activations" help="Forces at least this many entries to activate even with no keyword matches, scanning progressively older messages as needed. Set to 0 to disable.">
          <input
            type="number"
            min={0}
            value={bookMeta.minActivations}
            onChange={(e) => handleChange('minActivations', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Max Depth" help="How far back in chat history Min Activations is allowed to scan. Set to 0 for unlimited depth.">
          <input
            type="number"
            min={0}
            value={bookMeta.maxDepth}
            onChange={(e) => handleChange('maxDepth', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </FieldGroup>

      {/* Groups */}
      <FieldGroup label="Groups" defaultCollapsed>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <Toggle checked={bookMeta.useGroupScoring} onChange={(val) => handleChange('useGroupScoring', val)} />
          Use Group Scoring
          <HelpTooltip text="Global default for how entries compete within inclusion groups. When on, the entry with the most keyword matches wins; when off, entries are chosen by random weight rolling. Individual entries can override this setting." />
        </label>
      </FieldGroup>
    </div>
  )
}
