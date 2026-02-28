import { useCallback } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE, useDerivedState } from '@/hooks/useDerivedState'
import type { WorkingEntry, SelectiveLogic, EntryPosition } from '@/types'
import { estimateTokenCount } from '@/lib/token-estimate'
import { ContentEditor } from './ContentEditor'

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-3 pt-2">
        {label}
      </h4>
      <div className="px-3 space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-indigo-500 transition-colors'

const checkboxClass = 'w-3.5 h-3.5 accent-indigo-500'

interface EntryEditorProps {
  entryId: string
}

export function EntryEditor({ entryId }: EntryEditorProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entry = activeStore((s) => s.entries.find((e) => e.id === entryId))
  const { graph } = useDerivedState(activeTabId ?? '')

  const handleChange = useCallback(
    <K extends keyof WorkingEntry>(field: K, value: WorkingEntry[K]) => {
      if (!realStore) return
      const changes: Partial<WorkingEntry> = { [field]: value }
      // Recompute token count when content changes
      if (field === 'content') {
        changes.tokenCount = estimateTokenCount(String(value))
      }
      realStore.getState().updateEntry(entryId, changes)
      // Mark the tab dirty
      if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
    },
    [realStore, entryId, activeTabId]
  )

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-gray-600">Select an entry to edit</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto text-sm">
      {/* Identity */}
      <FieldGroup label="Identity">
        <Field label="Name">
          <input
            type="text"
            value={entry.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
            placeholder="Entry name"
          />
        </Field>
        <Field label={`Content (${entry.tokenCount} tokens)`}>
          <ContentEditor
            value={entry.content}
            entryId={entryId}
            graph={graph}
            onChange={(v) => handleChange('content', v)}
            inputClass={inputClass}
          />
        </Field>
      </FieldGroup>

      {/* Activation */}
      <FieldGroup label="Activation">
        <Field label="Primary Keywords (comma-separated)">
          <input
            type="text"
            value={entry.keys.join(', ')}
            onChange={(e) =>
              handleChange(
                'keys',
                e.target.value
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean)
              )
            }
            className={inputClass}
            placeholder="keyword1, keyword2"
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.constant}
            onChange={(e) => handleChange('constant', e.target.checked)}
            className={checkboxClass}
          />
          Constant (always active)
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.selective}
            onChange={(e) => handleChange('selective', e.target.checked)}
            className={checkboxClass}
          />
          Selective (requires secondary key match)
        </label>
        {entry.selective && (
          <>
            <Field label="Secondary Keywords (comma-separated)">
              <input
                type="text"
                value={entry.secondaryKeys.join(', ')}
                onChange={(e) =>
                  handleChange(
                    'secondaryKeys',
                    e.target.value
                      .split(',')
                      .map((k) => k.trim())
                      .filter(Boolean)
                  )
                }
                className={inputClass}
                placeholder="secondary1, secondary2"
              />
            </Field>
            <Field label="Selective Logic">
              <select
                value={entry.selectiveLogic}
                onChange={(e) => handleChange('selectiveLogic', Number(e.target.value) as SelectiveLogic)}
                className={inputClass}
              >
                <option value={0}>AND ANY (primary + any secondary)</option>
                <option value={1}>AND ALL (primary + all secondary)</option>
                <option value={2}>NOT ANY (primary + none of secondary)</option>
                <option value={3}>NOT ALL (primary, not all secondary)</option>
              </select>
            </Field>
          </>
        )}
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
            className={checkboxClass}
          />
          Enabled
        </label>
      </FieldGroup>

      {/* Priority */}
      <FieldGroup label="Priority">
        <Field label="Position (0–4)">
          <select
            value={entry.position}
            onChange={(e) => handleChange('position', Number(e.target.value) as EntryPosition)}
            className={inputClass}
          >
            <option value={0}>0 — After char (default)</option>
            <option value={1}>1 — After char (higher priority)</option>
            <option value={2}>2 — After char (speech patterns)</option>
            <option value={3}>3 — Scene depth</option>
            <option value={4}>4 — Highest priority (rules)</option>
          </select>
        </Field>
        <Field label="Order (higher = first)">
          <input
            type="number"
            value={entry.order}
            onChange={(e) => handleChange('order', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Depth">
          <input
            type="number"
            value={entry.depth}
            onChange={(e) => handleChange('depth', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </FieldGroup>

      {/* Timed Effects */}
      <FieldGroup label="Timed Effects">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Probability (%)">
            <input
              type="number"
              min={1}
              max={100}
              value={entry.probability}
              onChange={(e) => handleChange('probability', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Delay (msgs)">
            <input
              type="number"
              min={0}
              value={entry.delay}
              onChange={(e) => handleChange('delay', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Cooldown (msgs)">
            <input
              type="number"
              min={0}
              value={entry.cooldown}
              onChange={(e) => handleChange('cooldown', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Sticky (msgs)">
            <input
              type="number"
              min={0}
              value={entry.sticky}
              onChange={(e) => handleChange('sticky', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
      </FieldGroup>

      {/* Recursion */}
      <FieldGroup label="Recursion">
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.preventRecursion}
            onChange={(e) => handleChange('preventRecursion', e.target.checked)}
            className={checkboxClass}
          />
          Prevent Recursion (keys can't be triggered by content)
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.excludeRecursion}
            onChange={(e) => handleChange('excludeRecursion', e.target.checked)}
            className={checkboxClass}
          />
          Exclude Recursion (content invisible to recursive scan)
        </label>
      </FieldGroup>

      {/* Budget */}
      <FieldGroup label="Budget">
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.ignoreBudget}
            onChange={(e) => handleChange('ignoreBudget', e.target.checked)}
            className={checkboxClass}
          />
          Ignore Budget
        </label>
      </FieldGroup>
    </div>
  )
}
