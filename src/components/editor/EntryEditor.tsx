import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE, useDerivedState } from '@/hooks/useDerivedState'
import type { WorkingEntry, SelectiveLogic, EntryPosition } from '@/types'
import { estimateTokenCount } from '@/lib/token-estimate'
import { ContentEditor } from './ContentEditor'
import { KeywordInput } from './KeywordInput'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

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
        className="w-full text-left text-[10px] font-semibold tracking-wider text-gray-500 px-3 pt-2 pb-1 flex items-center gap-1.5 hover:text-gray-400 transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {label}
        {stOnly && <span className="text-[9px] font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/50 rounded px-1 py-0.5 normal-case tracking-normal">ST</span>}
      </button>
      {open && <div className="px-3 space-y-2 pb-2">{children}</div>}
    </div>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 flex items-center">
        {label}
        {help && <HelpTooltip text={help} />}
      </span>
      {children}
    </div>
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
        <Field label="Name" help="Display label for this entry in the lorebook editor. Not injected into the AI's context.">
          <input
            type="text"
            value={entry.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
            placeholder="Entry name"
          />
        </Field>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 flex items-center">
            {`Content (${entry.tokenCount} tokens)`}
            <HelpTooltip text="The text injected into the AI's context when this entry activates. Supports Markdown-style formatting depending on your AI platform." />
          </span>
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
        <Field label="Keys" help="Primary trigger keywords. When any key appears in the scan window, this entry may activate. Supports plain text or /regex/ patterns.">
          <KeywordInput
            value={entry.keys}
            onChange={(v) => handleChange('keys', v)}
            placeholder="keyword, keyword…"
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
          <HelpTooltip text="Entry is always active regardless of keyword matching. Counts against the token budget unless Ignore Budget is enabled." />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.selective}
            onChange={(e) => handleChange('selective', e.target.checked)}
            className={checkboxClass}
          />
          Selective (requires secondary key match)
          <HelpTooltip text="When checked, the entry only activates if secondary keys also match according to the Selective Logic rule." />
        </label>
        {entry.selective && (
          <>
            <Field label="Optional Filter (Secondary Keys)" help="Additional keywords evaluated after a primary key match. Activation depends on the Selective Logic setting.">
              <KeywordInput
                value={entry.secondaryKeys}
                onChange={(v) => handleChange('secondaryKeys', v)}
                placeholder="secondary, secondary…"
              />
            </Field>
            <Field label="Selective Logic" help="How secondary keys interact with primary keys: AND ANY (any secondary matches), AND ALL (all must match), NOT ANY (blocks if any secondary matches), NOT ALL (blocks only if all match).">
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
          <HelpTooltip text="When unchecked, this entry is completely disabled and will never activate." />
        </label>
      </FieldGroup>

      {/* Priority */}
      <FieldGroup label="Insertion">
        <Field label="Insertion Position" help="Where the entry's content is injected in the final prompt. 'Before/After Char Defs' frames the character card; '@ Depth' places content at a specific chat position; 'Author's Note' inserts into the AN block; 'Outlet' skips auto-injection and lets you place content manually via template macro.">
          <select
            value={entry.position}
            onChange={(e) => handleChange('position', Number(e.target.value) as EntryPosition)}
            className={inputClass}
          >
            <option value={0}>0 — Before Char Defs</option>
            <option value={1}>1 — After Char Defs (default)</option>
            <option value={2}>2 — Before Example Messages</option>
            <option value={3}>3 — After Example Messages</option>
            <option value={4}>4 — @ Depth</option>
            <option value={5}>5 — Top of Author's Note</option>
            <option value={6}>6 — Bottom of Author's Note</option>
            <option value={7}>7 — Outlet</option>
          </select>
        </Field>
        {entry.position === 4 && (
          <>
            <Field label="Context Depth" help="Chat depth at which this entry is injected. Depth 0 = bottom of the prompt (most recent); higher values insert further up in the conversation history.">
              <input
                type="number"
                value={entry.depth}
                onChange={(e) => handleChange('depth', Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Role" help="Whether this entry is injected as a system, user, or assistant message.">
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
          </>
        )}
        {entry.position === 7 && (
          <Field label="Outlet Name" help="The named outlet this entry's content is stored under. Reference it in your prompt template with {{outlet::Name}}.">
            <input
              type="text"
              value={entry.outletName}
              onChange={(e) => handleChange('outletName', e.target.value)}
              className={inputClass}
              placeholder="Outlet name"
            />
          </Field>
        )}
        <Field label="Insertion Order" help="Priority when multiple entries activate simultaneously. Higher values place entries closer to the end of the prompt, giving them more influence.">
          <input
            type="number"
            value={entry.order}
            onChange={(e) => handleChange('order', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </FieldGroup>

      {/* Timed Effects */}
      <FieldGroup label="Timed Effects" stOnly defaultCollapsed>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Trigger %" help="Probability (1–100) that the entry is inserted when its keys match. Use this to add randomness — e.g., 50% chance of injecting flavor text.">
            <input
              type="number"
              min={1}
              max={100}
              value={entry.probability}
              onChange={(e) => handleChange('probability', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Delay" help="Minimum number of messages that must exist in the chat before this entry can activate. Leave empty to use the global default.">
            <input
              type="number"
              min={0}
              value={entry.delay ?? ''}
              placeholder="Global default"
              onChange={(e) => handleChange('delay', e.target.value === '' ? null : Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Cooldown Duration" help="After this entry activates, it cannot activate again for this many messages. Leave empty to use the global default.">
            <input
              type="number"
              min={0}
              value={entry.cooldown ?? ''}
              placeholder="Global default"
              onChange={(e) => handleChange('cooldown', e.target.value === '' ? null : Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Sticky Duration" help="After activating, the entry stays injected for this many additional messages without needing keyword triggers. Leave empty to use the global default.">
            <input
              type="number"
              min={0}
              value={entry.sticky ?? ''}
              placeholder="Global default"
              onChange={(e) => handleChange('sticky', e.target.value === '' ? null : Number(e.target.value))}
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
          <HelpTooltip text="When active, this entry won't trigger other entries through recursion. Stops unintended cascading activation chains." />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.excludeRecursion}
            onChange={(e) => handleChange('excludeRecursion', e.target.checked)}
            className={checkboxClass}
          />
          Non-recursable
          <HelpTooltip text="This entry can only be activated by direct keyword matches in chat. Other entries cannot recursively trigger it." />
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
          <HelpTooltip text="Entry bypasses the token budget limit, ensuring it's always inserted regardless of how much context is used. Use sparingly for critical lore." />
        </label>
      </FieldGroup>

      {/* Group System */}
      <FieldGroup label="Inclusion Group" stOnly defaultCollapsed>
        <Field label="Inclusion Group" help="A shared label for mutually exclusive entries. When multiple entries in the same group activate, only one is inserted. Leave blank for independent entries.">
          <input
            type="text"
            value={entry.group}
            onChange={(e) => handleChange('group', e.target.value)}
            className={inputClass}
            placeholder="Group name"
          />
        </Field>
        <Field label="Group Weight" help="Relative likelihood of this entry being selected when competing within an inclusion group. Higher values increase selection probability.">
          <input
            type="number"
            min={0}
            value={entry.groupWeight}
            onChange={(e) => handleChange('groupWeight', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Use Group Scoring" help="When enabled, the entry with the most matching keys wins the group instead of random weight rolling. Default inherits the book-level setting.">
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
          <HelpTooltip text="Forces deterministic selection — picks the entry with the highest Insertion Order instead of random weight rolling." />
        </label>
      </FieldGroup>

      {/* Scan Settings */}
      <FieldGroup label="Scan Settings" stOnly defaultCollapsed>
        <Field label="Scan Depth (empty = book default)" help="Overrides the book-level scan depth for this entry only. Leave blank to inherit the book default.">
          <input
            type="number"
            placeholder="Default"
            value={entry.scanDepth ?? ''}
            onChange={(e) => handleChange('scanDepth', e.target.value === '' ? null : Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Case Sensitive" help="When enabled, keyword matching is case-sensitive ('King' won't match 'king'). Overrides the book-level default.">
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
        <Field label="Match Whole Words" help="When enabled, keywords only match complete words ('king' won't match 'liking'). Overrides the book-level default.">
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
            <HelpTooltip text="Scan the user's persona description for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchCharacterDescription}
              onChange={(e) => handleChange('matchCharacterDescription', e.target.checked)}
              className={checkboxClass}
            />
            Char Description
            <HelpTooltip text="Scan the character's description field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchCharacterPersonality}
              onChange={(e) => handleChange('matchCharacterPersonality', e.target.checked)}
              className={checkboxClass}
            />
            Char Personality
            <HelpTooltip text="Scan the character's personality field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchCharacterDepthPrompt}
              onChange={(e) => handleChange('matchCharacterDepthPrompt', e.target.checked)}
              className={checkboxClass}
            />
            Depth Prompt
            <HelpTooltip text="Scan the character's depth prompt / author's note field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchScenario}
              onChange={(e) => handleChange('matchScenario', e.target.checked)}
              className={checkboxClass}
            />
            Scenario
            <HelpTooltip text="Scan the scenario field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={entry.matchCreatorNotes}
              onChange={(e) => handleChange('matchCreatorNotes', e.target.checked)}
              className={checkboxClass}
            />
            Creator Notes
            <HelpTooltip text="Scan the creator notes field for trigger keywords." />
          </label>
        </div>
      </FieldGroup>

      {/* Triggers */}
      <FieldGroup label="Triggers" stOnly defaultCollapsed>
        <Field label="Triggers (comma-separated)" help="Restrict activation to specific generation types (Normal, Continue, Swipe, etc.). If empty, the entry activates for all generation types.">
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
          <HelpTooltip text="When checked, the character list becomes a blocklist — the entry activates for all characters except those named." />
        </label>
        <Field label="Character Names (comma-separated)" help="Characters this filter applies to. In allowlist mode, only these characters can trigger the entry; in exclude mode, these characters are blocked.">
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
        <Field label="Character Tags (comma-separated)" help="Filter by character tags instead of names. Works alongside the character names list.">
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
        <Field label="Automation ID" help="Connects this entry to an STscript in Quick Replies. When the entry activates, the matching script runs automatically.">
          <input
            type="text"
            value={entry.automationId}
            onChange={(e) => handleChange('automationId', e.target.value)}
            className={inputClass}
            placeholder="Automation ID"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Display Index" help="Controls the visual sort order of this entry in SillyTavern's World Info editor. Does not affect activation or injection.">
            <input
              type="number"
              value={entry.displayIndex}
              onChange={(e) => handleChange('displayIndex', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Delay Until Recursion" help="The entry stays inactive for this many recursion passes before it can be triggered by other entries.">
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
          <HelpTooltip text="Allows this entry to be activated through semantic similarity search (via the Vector Storage extension), in addition to keyword matching." />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.useProbability}
            onChange={(e) => handleChange('useProbability', e.target.checked)}
            className={checkboxClass}
          />
          Use Probability
          <HelpTooltip text="When enabled, the Trigger % value applies; when disabled, the entry always inserts if its keys match." />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={entry.addMemo}
            onChange={(e) => handleChange('addMemo', e.target.checked)}
            className={checkboxClass}
          />
          Add Memo
          <HelpTooltip text="Attaches a reference note to this entry visible in SillyTavern's editor. Not injected into context." />
        </label>
      </FieldGroup>
    </div>
  )
}
