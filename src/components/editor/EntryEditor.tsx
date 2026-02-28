import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE, useDerivedState } from '@/hooks/useDerivedState'
import type { WorkingEntry, SelectiveLogic, EntryPosition } from '@/types'
import { estimateTokenCount } from '@/lib/token-estimate'
import { ContentEditor } from './ContentEditor'

function FieldGroup({ label, stOnly, defaultCollapsed = false, children }: {
  label: string
  stOnly?: boolean
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
        {stOnly && <span className="text-[9px] font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/50 rounded px-1 py-0.5 normal-case tracking-normal">ST</span>}
      </button>
      {open && <div className="px-3 space-y-2 pb-2">{children}</div>}
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
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500">{`Content (${entry.tokenCount} tokens)`}</span>
          <ContentEditor
            value={entry.content}
            entryId={entryId}
            graph={graph}
            onChange={(v) => handleChange('content', v)}
            inputClass={inputClass}
          />
        </div>
      </FieldGroup>

      {/* Activation */}
      <FieldGroup label="Activation">
        <Field label="Keys">
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
            <Field label="Optional Filter">
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
      <FieldGroup label="Insertion">
        <Field label="Insertion Position">
          <select
            value={entry.position}
            onChange={(e) => handleChange('position', Number(e.target.value) as EntryPosition)}
            className={inputClass}
          >
            <option value={0}>0 — After char (top)</option>
            <option value={1}>1 — After char</option>
            <option value={2}>2 — In-chat</option>
            <option value={3}>3 — Before char</option>
            <option value={4}>4 — Highest priority</option>
          </select>
        </Field>
        <Field label="Insertion Order">
          <input
            type="number"
            value={entry.order}
            onChange={(e) => handleChange('order', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Context Depth">
          <input
            type="number"
            value={entry.depth}
            onChange={(e) => handleChange('depth', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </FieldGroup>

      {/* Timed Effects */}
      <FieldGroup label="Timed Effects" stOnly defaultCollapsed>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Trigger %">
            <input
              type="number"
              min={1}
              max={100}
              value={entry.probability}
              onChange={(e) => handleChange('probability', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Delay">
            <input
              type="number"
              min={0}
              value={entry.delay}
              onChange={(e) => handleChange('delay', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Cooldown Duration">
            <input
              type="number"
              min={0}
              value={entry.cooldown}
              onChange={(e) => handleChange('cooldown', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Sticky Duration">
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
      <FieldGroup label="Recursion" stOnly defaultCollapsed>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.preventRecursion}
            onChange={(e) => handleChange('preventRecursion', e.target.checked)}
            className={checkboxClass}
          />
          Prevent Further Recursion
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.excludeRecursion}
            onChange={(e) => handleChange('excludeRecursion', e.target.checked)}
            className={checkboxClass}
          />
          Non-recursable
        </label>
      </FieldGroup>

      {/* Budget */}
      <FieldGroup label="Budget" stOnly defaultCollapsed>
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

      {/* Group System */}
      <FieldGroup label="Inclusion Group" stOnly defaultCollapsed>
        <Field label="Inclusion Group">
          <input
            type="text"
            value={entry.group}
            onChange={(e) => handleChange('group', e.target.value)}
            className={inputClass}
            placeholder="Group name"
          />
        </Field>
        <Field label="Group Weight">
          <input
            type="number"
            min={0}
            value={entry.groupWeight}
            onChange={(e) => handleChange('groupWeight', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Use Group Scoring">
          <select
            value={entry.useGroupScoring === null ? '' : String(entry.useGroupScoring)}
            onChange={(e) => handleChange('useGroupScoring', e.target.value === '' ? null : e.target.value === 'true')}
            className={inputClass}
          >
            <option value="">Default (global setting)</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.groupOverride}
            onChange={(e) => handleChange('groupOverride', e.target.checked)}
            className={checkboxClass}
          />
          Prioritize Inclusion
        </label>
      </FieldGroup>

      {/* Scan Settings */}
      <FieldGroup label="Scan Settings" stOnly defaultCollapsed>
        <Field label="Scan Depth (empty = book default)">
          <input
            type="number"
            placeholder="Default"
            value={entry.scanDepth ?? ''}
            onChange={(e) => handleChange('scanDepth', e.target.value === '' ? null : Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Case Sensitive">
          <select
            value={entry.caseSensitive === null ? '' : String(entry.caseSensitive)}
            onChange={(e) => handleChange('caseSensitive', e.target.value === '' ? null : e.target.value === 'true')}
            className={inputClass}
          >
            <option value="">Default (book setting)</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="Match Whole Words">
          <select
            value={entry.matchWholeWords === null ? '' : String(entry.matchWholeWords)}
            onChange={(e) => handleChange('matchWholeWords', e.target.value === '' ? null : e.target.value === 'true')}
            className={inputClass}
          >
            <option value="">Default (book setting)</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </FieldGroup>

      {/* Match Sources */}
      <FieldGroup label="Match Sources" stOnly defaultCollapsed>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchPersonaDescription}
              onChange={(e) => handleChange('matchPersonaDescription', e.target.checked)}
              className={checkboxClass}
            />
            Persona Description
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchCharacterDescription}
              onChange={(e) => handleChange('matchCharacterDescription', e.target.checked)}
              className={checkboxClass}
            />
            Char Description
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchCharacterPersonality}
              onChange={(e) => handleChange('matchCharacterPersonality', e.target.checked)}
              className={checkboxClass}
            />
            Char Personality
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchCharacterDepthPrompt}
              onChange={(e) => handleChange('matchCharacterDepthPrompt', e.target.checked)}
              className={checkboxClass}
            />
            Depth Prompt
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchScenario}
              onChange={(e) => handleChange('matchScenario', e.target.checked)}
              className={checkboxClass}
            />
            Scenario
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchCreatorNotes}
              onChange={(e) => handleChange('matchCreatorNotes', e.target.checked)}
              className={checkboxClass}
            />
            Creator Notes
          </label>
        </div>
      </FieldGroup>

      {/* Triggers */}
      <FieldGroup label="Triggers" stOnly defaultCollapsed>
        <Field label="Triggers (comma-separated)">
          <input
            type="text"
            value={entry.triggers.join(', ')}
            onChange={(e) =>
              handleChange(
                'triggers',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              )
            }
            className={inputClass}
            placeholder="trigger1, trigger2"
          />
        </Field>
      </FieldGroup>

      {/* Character Filter */}
      <FieldGroup label="Character Filter" stOnly defaultCollapsed>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.characterFilter.isExclude}
            onChange={(e) =>
              handleChange('characterFilter', { ...entry.characterFilter, isExclude: e.target.checked })
            }
            className={checkboxClass}
          />
          Exclude (block listed characters instead of allow)
        </label>
        <Field label="Character Names (comma-separated)">
          <input
            type="text"
            value={entry.characterFilter.names.join(', ')}
            onChange={(e) =>
              handleChange('characterFilter', {
                ...entry.characterFilter,
                names: e.target.value
                  .split(',')
                  .map((n) => n.trim())
                  .filter(Boolean),
              })
            }
            className={inputClass}
            placeholder="CharacterName1, CharacterName2"
          />
        </Field>
        <Field label="Character Tags (comma-separated)">
          <input
            type="text"
            value={entry.characterFilter.tags.join(', ')}
            onChange={(e) =>
              handleChange('characterFilter', {
                ...entry.characterFilter,
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className={inputClass}
            placeholder="tag1, tag2"
          />
        </Field>
      </FieldGroup>

      {/* Advanced */}
      <FieldGroup label="Advanced" stOnly defaultCollapsed>
        <Field label="Role">
          <select
            value={entry.role}
            onChange={(e) => handleChange('role', Number(e.target.value))}
            className={inputClass}
          >
            <option value={0}>System</option>
            <option value={1}>User</option>
            <option value={2}>Assistant</option>
          </select>
        </Field>
        <Field label="Automation ID">
          <input
            type="text"
            value={entry.automationId}
            onChange={(e) => handleChange('automationId', e.target.value)}
            className={inputClass}
            placeholder="Automation ID"
          />
        </Field>
        <Field label="Outlet Name">
          <input
            type="text"
            value={entry.outletName}
            onChange={(e) => handleChange('outletName', e.target.value)}
            className={inputClass}
            placeholder="Outlet name"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Display Index">
            <input
              type="number"
              value={entry.displayIndex}
              onChange={(e) => handleChange('displayIndex', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Delay Until Recursion">
            <input
              type="number"
              min={0}
              value={entry.delayUntilRecursion}
              onChange={(e) => handleChange('delayUntilRecursion', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.vectorized}
            onChange={(e) => handleChange('vectorized', e.target.checked)}
            className={checkboxClass}
          />
          Vectorized
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.useProbability}
            onChange={(e) => handleChange('useProbability', e.target.checked)}
            className={checkboxClass}
          />
          Use Probability
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.addMemo}
            onChange={(e) => handleChange('addMemo', e.target.checked)}
            className={checkboxClass}
          />
          Add Memo
        </label>
      </FieldGroup>
    </div>
  )
}
