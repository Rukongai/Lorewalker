import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
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
        className="w-full text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-3 pt-2 pb-1 flex items-center gap-1.5 hover:text-gray-400 transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {label}
      </button>
      {open && <div className="px-3 space-y-2 pb-2">{children}</div>}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500">
        {label}
        {hint && <span className="ml-1 text-gray-600 normal-case">— {hint}</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-indigo-500 transition-colors'

const checkboxClass = 'w-3.5 h-3.5 accent-indigo-500'

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
        <p className="text-xs text-gray-600">No book open</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto text-sm">
      {/* Book Info */}
      <FieldGroup label="Book Info">
        <Field label="Name">
          <input
            type="text"
            value={bookMeta.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
            placeholder="Lorebook name"
          />
        </Field>
        <Field label="Description">
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
        <Field label="Scan Depth" hint="How many messages back to scan for keywords">
          <input
            type="number"
            min={0}
            value={bookMeta.scanDepth}
            onChange={(e) => handleChange('scanDepth', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={bookMeta.includeNames}
            onChange={(e) => handleChange('includeNames', e.target.checked)}
            className={checkboxClass}
          />
          Include Names — Include message author names in keyword scan
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={bookMeta.caseSensitive}
            onChange={(e) => handleChange('caseSensitive', e.target.checked)}
            className={checkboxClass}
          />
          Case-sensitive Keys
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={bookMeta.matchWholeWords}
            onChange={(e) => handleChange('matchWholeWords', e.target.checked)}
            className={checkboxClass}
          />
          Match Whole Words
        </label>
      </FieldGroup>

      {/* Budget */}
      <FieldGroup label="Budget" defaultCollapsed>
        <Field label="Context %" hint="Token budget for World Info entries">
          <input
            type="number"
            min={0}
            value={bookMeta.tokenBudget}
            onChange={(e) => handleChange('tokenBudget', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Budget Cap" hint="Hard token cap; 0 = no cap">
          <input
            type="number"
            min={0}
            value={bookMeta.budgetCap}
            onChange={(e) => handleChange('budgetCap', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={bookMeta.alertOnOverflow}
            onChange={(e) => handleChange('alertOnOverflow', e.target.checked)}
            className={checkboxClass}
          />
          Alert on Overflow
        </label>
        <Field label="Insertion Strategy">
          <select
            value={bookMeta.insertionStrategy}
            onChange={(e) => handleChange('insertionStrategy', e.target.value as 'none' | 'evenly')}
            className={inputClass}
          >
            <option value="none">None</option>
            <option value="evenly">Evenly</option>
          </select>
        </Field>
      </FieldGroup>

      {/* Activation */}
      <FieldGroup label="Activation" defaultCollapsed>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={bookMeta.recursiveScan}
            onChange={(e) => handleChange('recursiveScan', e.target.checked)}
            className={checkboxClass}
          />
          Recursive Scan
        </label>
        <Field label="Max Recursion Steps" hint="0 = unlimited">
          <input
            type="number"
            min={0}
            value={bookMeta.maxRecursionSteps}
            onChange={(e) => handleChange('maxRecursionSteps', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Min Activations" hint="Minimum entries to activate; 0 = disabled">
          <input
            type="number"
            min={0}
            value={bookMeta.minActivations}
            onChange={(e) => handleChange('minActivations', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Max Depth" hint="Max message depth for Min Activations; 0 = unlimited">
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
          <input
            type="checkbox"
            checked={bookMeta.useGroupScoring}
            onChange={(e) => handleChange('useGroupScoring', e.target.checked)}
            className={checkboxClass}
          />
          Use Group Scoring — Global default; entries can override
        </label>
      </FieldGroup>
    </div>
  )
}
