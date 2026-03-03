import { useCallback, useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE, useDerivedState } from '@/hooks/useDerivedState'
import type { WorkingEntry, SelectiveLogic, EntryPosition, RoleCallPosition } from '@/types'
import { estimateTokenCount } from '@/lib/token-estimate'
import { getEntryIcon } from '@/lib/entry-type'
import { ContentEditor } from './ContentEditor'
import { KeywordInput } from './KeywordInput'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { ActivationLinks } from './ActivationLinks'
import { useCategoryMenu } from '@/components/entry-list/CategoryMenu'
import { FormatViewToggle } from './FormatViewToggle'
import { ConditionsViewer } from './ConditionsViewer'
import { RoleCallPositionSelect } from './RoleCallPositionSelect'

function FieldGroup({ label, stOnly, defaultCollapsed = false, labelSuffix, headerRight, children }: {
  label: string
  stOnly?: boolean
  defaultCollapsed?: boolean
  labelSuffix?: React.ReactNode
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!defaultCollapsed)
  return (
    <div className="mb-4">
      <div className="flex items-center">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 text-left text-[11px] font-semibold tracking-wider text-ctp-subtext0 px-3 pt-2 pb-1 flex items-center gap-1.5 hover:text-ctp-subtext1 transition-colors"
        >
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <span className="truncate">{label}</span>
          {stOnly && <span className="text-[9px] font-semibold bg-ctp-peach/15 text-ctp-yellow border border-ctp-peach/30 rounded px-1 py-0.5 normal-case tracking-normal shrink-0">ST</span>}
          {labelSuffix}
        </button>
        {headerRight}
      </div>
      {open && <div className="px-3 space-y-2 pb-2">{children}</div>}
    </div>
  )
}

function CategoryPane({
  categories,
  selected,
  onSelect,
}: {
  categories: Array<{ key: string; label: string; stOnly?: boolean; content: React.ReactNode }>
  selected: string
  onSelect: (key: string) => void
}) {
  const active = categories.find((c) => c.key === selected) ?? categories[0]
  return (
    <div className="flex h-full">
      {/* Left: category list */}
      <div className="w-44 shrink-0 border-r border-ctp-surface1 overflow-y-auto flex flex-col py-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-1 ${
              cat.key === active.key
                ? 'bg-ctp-surface1 text-ctp-text font-medium'
                : 'text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0'
            }`}
          >
            <span className="truncate">{cat.label}</span>
            {cat.stOnly && (
              <span className="text-[9px] font-semibold bg-ctp-peach/15 text-ctp-yellow border border-ctp-peach/30 rounded px-1 py-0.5 tracking-normal shrink-0">
                ST
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Right: selected category fields */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-ctp-subtext0 pb-1 flex items-center gap-1.5">
          {active.label}
          {active.stOnly && (
            <span className="text-[9px] font-semibold bg-ctp-peach/15 text-ctp-yellow border border-ctp-peach/30 rounded px-1 py-0.5 tracking-normal">
              ST
            </span>
          )}
        </p>
        {active.content}
      </div>
    </div>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-ctp-subtext0 flex items-center">
        {label}
        {help && <HelpTooltip text={help} />}
      </span>
      {children}
    </div>
  )
}

const inputClass =
  'w-full bg-ctp-surface0 border border-ctp-surface2 rounded px-2 py-1.5 text-xs text-ctp-subtext1 outline-none focus:border-ctp-accent transition-colors placeholder:text-ctp-overlay1'

type InsertionStrategy = 'constant' | 'normal' | 'vectorized'

const TRIGGER_OPTIONS = ['Normal', 'Continue', 'Impersonate', 'Swipe', 'Regenerate', 'Quiet'] as const

interface EntryEditorProps {
  entryId: string
  layout?: 'single' | 'wide' | 'quadrant'
  onNavigate?: (entryId: string) => void
  renderBottomLeft?: () => React.ReactNode
  renderBottomRight?: () => React.ReactNode
}

function WideLayout({
  entryId,
  graph,
  onNavigate,
  nameField,
  contentField,
  fieldGroups,
}: {
  entryId: string
  graph: import('@/types').RecursionGraph
  onNavigate?: (entryId: string) => void
  nameField: React.ReactNode
  contentField: React.ReactNode
  fieldGroups: React.ReactNode
}) {
  const [topHeight, setTopHeight] = useState(260)

  const startRowDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = topHeight
    const onMove = (mv: MouseEvent) => {
      const delta = mv.clientY - startY
      setTopHeight(Math.max(120, Math.min(startHeight + delta, 600)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [topHeight])

  return (
    <div className="flex flex-row h-full text-sm">
      {/* Left panel: drag-split between fields and activation links */}
      <div className="w-[60%] flex flex-col border-r border-ctp-surface1 h-full">
        <div style={{ height: topHeight }} className="shrink-0 overflow-y-auto p-3 space-y-3">
          {nameField}
          {contentField}
        </div>
        <div
          className="h-1 shrink-0 cursor-row-resize bg-ctp-surface0 hover:bg-ctp-accent transition-colors"
          onMouseDown={startRowDrag}
        />
        <div className="flex-1 min-h-0 border-t border-ctp-surface1">
          <ActivationLinks
            entryId={entryId}
            graph={graph}
            onNavigate={onNavigate ?? (() => {})}
          />
        </div>
      </div>
      {/* Right panel: all field groups */}
      <div className="w-[40%] overflow-y-auto">
        {fieldGroups}
      </div>
    </div>
  )
}

function QuadrantLayout({
  nameField,
  contentField,
  fieldGroups,
  renderBottomLeft,
  renderBottomRight,
}: {
  nameField: React.ReactNode
  contentField: React.ReactNode
  fieldGroups: React.ReactNode
  renderBottomLeft?: () => React.ReactNode
  renderBottomRight?: () => React.ReactNode
}) {
  return (
    <div className="flex h-full">
      {/* Left column: 60% wide, top 40% / bottom 60% */}
      <div className="flex flex-col border-r border-ctp-surface1" style={{ width: '60%' }}>
        {/* Top-left: name + content */}
        <div className="overflow-y-auto p-3 space-y-3 border-b border-ctp-surface1" style={{ flex: '40 1 0' }}>
          {nameField}
          {contentField}
        </div>
        {/* Bottom-left: connections pane (injected by modal) */}
        <div className="overflow-hidden" style={{ flex: '60 1 0' }}>
          {renderBottomLeft?.()}
        </div>
      </div>
      {/* Right column: 40% wide, top 60% / bottom 40% */}
      <div className="flex flex-col" style={{ width: '40%' }}>
        {/* Top-right: category pane or field groups */}
        <div className="overflow-hidden border-b border-ctp-surface1" style={{ flex: '40 1 0' }}>
          {fieldGroups}
        </div>
        {/* Bottom-right: findings pane (injected by modal) */}
        <div className="overflow-hidden" style={{ flex: '60 1 0' }}>
          {renderBottomRight?.()}
        </div>
      </div>
    </div>
  )
}

export function EntryEditor({ entryId, layout = 'single', onNavigate, renderBottomLeft, renderBottomRight }: EntryEditorProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entry = activeStore((s) => s.entries.find((e) => e.id === entryId))
  const bookMatchWholeWords = activeStore((s) => s.bookMeta.matchWholeWords)
  const { graph } = useDerivedState(activeTabId ?? '')

  const originalFormat = useWorkspaceStore((s) =>
    s.tabs.find((t) => t.id === activeTabId)?.fileMeta.originalFormat ?? 'unknown'
  )
  const editorFormatView = activeStore((s) => s.editorFormatView)
  const setEditorFormatView = activeStore((s) => s.setEditorFormatView)
  const isRoleCall = originalFormat === 'rolecall'

  const categoryBehavior = useWorkspaceStore((s) => s.editorDefaults.categoryBehavior)
  const lastEditorCategory = useWorkspaceStore((s) => s.editorDefaults.lastEditorCategory)
  const editorDefaults = useWorkspaceStore((s) => s.editorDefaults)
  const setEditorDefaults = useWorkspaceStore((s) => s.setEditorDefaults)

  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryBehavior === 'remember' ? lastEditorCategory : 'Activation'
  )

  const handleCategorySelect = useCallback((key: string) => {
    setSelectedCategory(key)
    if (categoryBehavior === 'remember') {
      setEditorDefaults({ ...editorDefaults, lastEditorCategory: key })
    }
  }, [categoryBehavior, editorDefaults, setEditorDefaults])

  const handleChange = useCallback(
    <K extends keyof WorkingEntry>(field: K, value: WorkingEntry[K]) => {
      if (!realStore) return
      const changes: Partial<WorkingEntry> = { [field]: value }
      if (field === 'content') {
        changes.tokenCount = estimateTokenCount(String(value))
      }
      if (field === 'name') {
        changes.addMemo = String(value).trim().length > 0
      }
      if (field === 'probability') {
        changes.useProbability = Number(value) < 100
      }
      realStore.getState().updateEntry(entryId, changes)
      if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
    },
    [realStore, entryId, activeTabId]
  )

  const handleSecondaryKeysChange = useCallback((v: string[]) => {
    if (!realStore) return
    const changes: Partial<WorkingEntry> = { secondaryKeys: v }
    if (v.length === 0) changes.selective = false
    realStore.getState().updateEntry(entryId, changes)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, entryId, activeTabId])

  const handleStrategyChange = useCallback((strategy: InsertionStrategy) => {
    if (!realStore) return
    const changes: Partial<WorkingEntry> =
      strategy === 'constant'
        ? { constant: true, vectorized: false }
        : strategy === 'vectorized'
          ? { constant: false, vectorized: true }
          : { constant: false, vectorized: false }
    realStore.getState().updateEntry(entryId, changes)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, entryId, activeTabId])

  const handleTriggerToggle = useCallback((trigger: string) => {
    if (!realStore || !entry) return
    const next = entry.triggers.includes(trigger)
      ? entry.triggers.filter((t) => t !== trigger)
      : [...entry.triggers, trigger]
    realStore.getState().updateEntry(entryId, { triggers: next })
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, entry, entryId, activeTabId])

  const handleSetCategory = useCallback((category: string | undefined) => {
    if (!realStore) return
    realStore.getState().setEntryCategory(entryId, category)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, entryId, activeTabId])

  const handleRoleCallPositionChange = useCallback((pos: RoleCallPosition) => {
    if (!realStore) return
    realStore.getState().updateEntry(entryId, { positionRoleCall: pos })
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, entryId, activeTabId])

  const effectiveCategory = entry?.userCategory ?? 'generic'
  const categoryIcon = getEntryIcon(effectiveCategory)

  const { openMenu: openCategoryMenu, menuElement: categoryMenuElement } = useCategoryMenu(handleSetCategory)

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Select an entry to edit</p>
      </div>
    )
  }

  const strategy: InsertionStrategy = entry.constant ? 'constant' : entry.vectorized ? 'vectorized' : 'normal'

  const strategyActiveClass: Record<InsertionStrategy, string> = {
    constant:   'bg-ctp-mauve/40 text-ctp-mauve font-medium',
    normal:     'bg-ctp-sky/40 text-ctp-sky font-medium',
    vectorized: 'bg-ctp-sapphire/40 text-ctp-sapphire font-medium',
  }
  const strategyInactiveClass = 'bg-ctp-surface0 text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface1'

  const nameField = (
    <>
      <Field label="Name" help="Display label for this entry in the lorebook editor. Not injected into the AI's context.">
        <input
          type="text"
          value={entry.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={inputClass}
          placeholder="Entry name"
        />
      </Field>
      {isRoleCall && (
        <Field label="Notes" help="RoleCall comment field — a separate notes area distinct from the entry title.">
          <input
            type="text"
            value={entry.rolecallComment ?? ''}
            onChange={(e) => handleChange('rolecallComment', e.target.value || undefined)}
            className={inputClass}
            placeholder="Optional notes…"
          />
        </Field>
      )}
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-[11px] text-ctp-subtext0">Category</span>
        <Tooltip text="Click to change category">
          <button
            onClick={(e) => openCategoryMenu(e, entry.userCategory)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-ctp-surface0 hover:bg-ctp-surface1 border border-ctp-surface2 transition-colors"
          >
            {categoryIcon && <span className="text-[11px]">{categoryIcon}</span>}
            <span className="text-ctp-subtext1 capitalize">{effectiveCategory}</span>
          </button>
        </Tooltip>
        {entry.userCategory && (
          <Tooltip text="Clear category override">
            <button
              onClick={() => handleSetCategory(undefined)}
              className="text-[9px] text-ctp-overlay1 hover:text-ctp-red transition-colors"
            >
              ✕
            </button>
          </Tooltip>
        )}
        {categoryMenuElement}
      </div>
    </>
  )

  const contentField = (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-ctp-subtext0 flex items-center">
        {`Content (${entry.tokenCount} tokens)`}
        <HelpTooltip text="The text injected into the AI's context when this entry activates. Supports Markdown-style formatting depending on your AI platform." />
      </span>
      <ContentEditor
        value={entry.content}
        entryId={entryId}
        graph={graph}
        onChange={(v) => handleChange('content', v)}
        inputClass={inputClass}
        preventRecursion={entry.preventRecursion}
        matchWholeWords={bookMatchWholeWords ?? false}
      />
    </div>
  )

  const fieldGroups = (
    <>
      {isRoleCall && (
        <FormatViewToggle view={editorFormatView} onChange={setEditorFormatView} />
      )}

      {/* RoleCall Triggers — shown only in native view */}
      {isRoleCall && editorFormatView === 'native' && (entry.keywordObjects?.length || entry.triggerConditions?.length) ? (
        <FieldGroup label="RoleCall Triggers">
          {entry.triggerMode && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-ctp-subtext0">Mode:</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.triggerMode === 'advanced' ? 'bg-ctp-mauve/20 text-ctp-mauve' : 'bg-ctp-surface1 text-ctp-subtext1'}`}>
                {entry.triggerMode}
              </span>
            </div>
          )}
          {entry.keywordObjects && entry.keywordObjects.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-ctp-subtext0">Keywords ({entry.keywordObjects.length})</span>
              <div className="flex flex-wrap gap-1">
                {entry.keywordObjects.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-ctp-sky/15 text-ctp-sky border border-ctp-sky/30"
                    title={`regex: ${kw.isRegex}, probability: ${kw.probability}%`}
                  >
                    {kw.isRegex && <span className="font-mono opacity-60">/</span>}
                    <span>{kw.keyword}</span>
                    {kw.probability < 100 && <span className="opacity-60">{kw.probability}%</span>}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-ctp-overlay1">Read-only — edit keywords above to update</span>
            </div>
          )}
          {entry.triggerConditions && entry.triggerConditions.length > 0 && (
            <ConditionsViewer conditions={entry.triggerConditions} />
          )}
        </FieldGroup>
      ) : null}

      {/* Activation */}
      <FieldGroup label="Activation">
        <Field
          label="Insertion Strategy"
          help="Controls how this entry activates. Constant = always active; Normal = keyword-triggered; Vectorized = semantic similarity search."
        >
          <div className="flex rounded border border-ctp-surface1 overflow-hidden">
            {(['constant', 'normal', 'vectorized'] as InsertionStrategy[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStrategyChange(s)}
                className={`flex-1 px-2 py-1 text-xs capitalize transition-colors ${strategy === s ? strategyActiveClass[s] : strategyInactiveClass}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.selective} onChange={(val) => handleChange('selective', val)} />
          Selective (requires secondary key match)
          <HelpTooltip text="When checked, the entry only activates if secondary keys also match according to the Selective Logic rule." />
        </label>
        <Field label="Keys" help="Primary trigger keywords. When any key appears in the scan window, this entry may activate. Supports plain text or /regex/ patterns.">
          <KeywordInput
            value={entry.keys}
            onChange={(v) => handleChange('keys', v)}
            placeholder="keyword, keyword…"
          />
        </Field>
        {entry.selective && (
          <>
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
            <Field label="Secondary Keys (Optional Filter)" help="Additional keywords evaluated after a primary key match. Activation depends on the Selective Logic setting.">
              <KeywordInput
                variant="secondary"
                value={entry.secondaryKeys}
                onChange={handleSecondaryKeysChange}
                placeholder="secondary, secondary…"
              />
            </Field>
          </>
        )}
      </FieldGroup>

      {/* Insertion */}
      <FieldGroup label="Insertion">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Position" help={isRoleCall && editorFormatView === 'native' ? "RoleCall injection position. World/Character inject near character context; Scene injects near recent messages; @ Depth injects at an exact chat depth." : "Where the entry's content is injected in the final prompt."}>
            {isRoleCall && editorFormatView === 'native' ? (
              <RoleCallPositionSelect
                value={entry.positionRoleCall ?? 'depth'}
                onChange={handleRoleCallPositionChange}
              />
            ) : (
              <select
                value={entry.position}
                onChange={(e) => handleChange('position', Number(e.target.value) as EntryPosition)}
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
              onChange={(e) => handleChange('order', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
        {(isRoleCall && editorFormatView === 'native' ? entry.positionRoleCall === 'depth' : entry.position === 4) && (
          <div className="grid grid-cols-2 gap-2">
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
            <Field label="Context Depth" help="Chat depth at which this entry is injected. Depth 0 = bottom of the prompt (most recent); higher values insert further up in the conversation history.">
              <input
                type="number"
                value={entry.depth}
                onChange={(e) => handleChange('depth', Number(e.target.value))}
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
              onChange={(e) => handleChange('outletName', e.target.value)}
              className={inputClass}
              placeholder="Outlet name"
            />
          </Field>
        )}
      </FieldGroup>

      {/* Timed Effects */}
      <FieldGroup label="Timed Effects" stOnly defaultCollapsed>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Trigger %" help="Probability (1–100) that the entry is inserted when its keys match. Set below 100 to add randomness. Probability is enabled automatically when below 100.">
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
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.preventRecursion} onChange={(val) => handleChange('preventRecursion', val)} />
          Prevent Further Recursion
          <HelpTooltip text="When active, this entry won't trigger other entries through recursion. Stops unintended cascading activation chains." />
        </label>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.excludeRecursion} onChange={(val) => handleChange('excludeRecursion', val)} />
          Non-recursable
          <HelpTooltip text="This entry can only be activated by direct keyword matches in chat. Other entries cannot recursively trigger it." />
        </label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0 shrink-0">
            <Toggle
              checked={entry.delayUntilRecursion > 0}
              onChange={(val) => handleChange('delayUntilRecursion', val ? 1 : 0)}
            />
            Delay Until Recursion
            <HelpTooltip text="The entry stays inactive for this many recursion passes before it can be triggered by other entries." />
          </label>
          {entry.delayUntilRecursion > 0 && (
            <input
              type="number"
              min={1}
              value={entry.delayUntilRecursion}
              onChange={(e) => handleChange('delayUntilRecursion', Number(e.target.value))}
              className={`${inputClass} w-16`}
            />
          )}
        </div>
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
        <div className="grid grid-cols-2 gap-2">
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
              <option value="">Default</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.groupOverride} onChange={(val) => handleChange('groupOverride', val)} />
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
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchPersonaDescription} onChange={(val) => handleChange('matchPersonaDescription', val)} />
            Persona Description
            <HelpTooltip text="Scan the user's persona description for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchCharacterDescription} onChange={(val) => handleChange('matchCharacterDescription', val)} />
            Char Description
            <HelpTooltip text="Scan the character's description field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchCharacterPersonality} onChange={(val) => handleChange('matchCharacterPersonality', val)} />
            Char Personality
            <HelpTooltip text="Scan the character's personality field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchCharacterDepthPrompt} onChange={(val) => handleChange('matchCharacterDepthPrompt', val)} />
            Depth Prompt
            <HelpTooltip text="Scan the character's depth prompt / author's note field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchScenario} onChange={(val) => handleChange('matchScenario', val)} />
            Scenario
            <HelpTooltip text="Scan the scenario field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchCreatorNotes} onChange={(val) => handleChange('matchCreatorNotes', val)} />
            Creator Notes
            <HelpTooltip text="Scan the creator notes field for trigger keywords." />
          </label>
        </div>
      </FieldGroup>

      {/* Triggers */}
      <FieldGroup label="Triggers" stOnly defaultCollapsed>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-ctp-subtext0 flex items-center">
            Generation Types
            <HelpTooltip text="Restrict activation to specific generation types. If none are selected, the entry activates for all generation types." />
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TRIGGER_OPTIONS.map((trigger) => {
              const active = entry.triggers.includes(trigger)
              return (
                <button
                  key={trigger}
                  onClick={() => handleTriggerToggle(trigger)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    active
                      ? 'bg-ctp-mauve text-ctp-base font-medium'
                      : 'bg-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface2 hover:text-ctp-text'
                  }`}
                >
                  {trigger}
                </button>
              )
            })}
          </div>
        </div>
      </FieldGroup>

      {/* Character Filter */}
      <FieldGroup label="Character Filter" stOnly defaultCollapsed>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle
            checked={entry.characterFilter.isExclude}
            onChange={(val) => handleChange('characterFilter', { ...entry.characterFilter, isExclude: val })}
          />
          Exclude (block listed characters instead of allow)
          <HelpTooltip text="When checked, the character list becomes a blocklist — the entry activates for all characters except those named." />
        </label>
        <Field label="Character Names" help="Characters this filter applies to. In allowlist mode, only these characters can trigger the entry; in exclude mode, these characters are blocked.">
          <KeywordInput
            value={entry.characterFilter.names}
            onChange={(names) => handleChange('characterFilter', { ...entry.characterFilter, names })}
            placeholder="CharacterName…"
          />
        </Field>
        <Field label="Character Tags" help="Filter by character tags instead of names. Works alongside the character names list.">
          <KeywordInput
            variant="secondary"
            value={entry.characterFilter.tags}
            onChange={(tags) => handleChange('characterFilter', { ...entry.characterFilter, tags })}
            placeholder="tag…"
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
        <Field label="Display Index" help="Controls the visual sort order of this entry in SillyTavern's World Info editor. Does not affect activation or injection.">
          <input
            type="number"
            value={entry.displayIndex ?? ''}
            onChange={(e) => handleChange('displayIndex', e.target.value === '' ? null : Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.ignoreBudget} onChange={(val) => handleChange('ignoreBudget', val)} />
          Ignore Budget
          <HelpTooltip text="Entry bypasses the token budget limit, ensuring it's always inserted regardless of how much context is used. Use sparingly for critical lore." />
        </label>
      </FieldGroup>
    </>
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const categories = useMemo(() => [
    {
      key: 'Activation',
      label: 'Activation',
      content: (
        <>
          <Field
            label="Insertion Strategy"
            help="Controls how this entry activates. Constant = always active; Normal = keyword-triggered; Vectorized = semantic similarity search."
          >
            <div className="flex rounded border border-ctp-surface1 overflow-hidden">
              {(['constant', 'normal', 'vectorized'] as InsertionStrategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStrategyChange(s)}
                  className={`flex-1 px-2 py-1 text-xs capitalize transition-colors ${strategy === s ? strategyActiveClass[s] : strategyInactiveClass}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.selective} onChange={(val) => handleChange('selective', val)} />
            Selective (requires secondary key match)
            <HelpTooltip text="When checked, the entry only activates if secondary keys also match according to the Selective Logic rule." />
          </label>
          <Field label="Keys" help="Primary trigger keywords. When any key appears in the scan window, this entry may activate. Supports plain text or /regex/ patterns.">
            <KeywordInput
              value={entry.keys}
              onChange={(v) => handleChange('keys', v)}
              placeholder="keyword, keyword…"
            />
          </Field>
          {entry.selective && (
            <>
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
              <Field label="Secondary Keys (Optional Filter)" help="Additional keywords evaluated after a primary key match. Activation depends on the Selective Logic setting.">
                <KeywordInput
                  variant="secondary"
                  value={entry.secondaryKeys}
                  onChange={handleSecondaryKeysChange}
                  placeholder="secondary, secondary…"
                />
              </Field>
            </>
          )}
        </>
      ),
    },
    {
      key: 'Insertion',
      label: 'Insertion',
      content: (
        <>
          {isRoleCall && (
            <FormatViewToggle view={editorFormatView} onChange={setEditorFormatView} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Position" help={isRoleCall && editorFormatView === 'native' ? "RoleCall injection position." : "Where the entry's content is injected in the final prompt."}>
              {isRoleCall && editorFormatView === 'native' ? (
                <RoleCallPositionSelect
                  value={entry.positionRoleCall ?? 'depth'}
                  onChange={handleRoleCallPositionChange}
                />
              ) : (
                <select
                  value={entry.position}
                  onChange={(e) => handleChange('position', Number(e.target.value) as EntryPosition)}
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
                onChange={(e) => handleChange('order', Number(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>
          {(isRoleCall && editorFormatView === 'native' ? entry.positionRoleCall === 'depth' : entry.position === 4) && (
            <div className="grid grid-cols-2 gap-2">
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
              <Field label="Context Depth" help="Chat depth at which this entry is injected. Depth 0 = bottom of the prompt (most recent); higher values insert further up in the conversation history.">
                <input
                  type="number"
                  value={entry.depth}
                  onChange={(e) => handleChange('depth', Number(e.target.value))}
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
                onChange={(e) => handleChange('outletName', e.target.value)}
                className={inputClass}
                placeholder="Outlet name"
              />
            </Field>
          )}
        </>
      ),
    },
    {
      key: 'Timed Effects',
      label: 'Timed Effects',
      stOnly: true,
      content: (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Trigger %" help="Probability (1–100) that the entry is inserted when its keys match. Set below 100 to add randomness. Probability is enabled automatically when below 100.">
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
      ),
    },
    {
      key: 'Recursion',
      label: 'Recursion',
      stOnly: true,
      content: (
        <>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.preventRecursion} onChange={(val) => handleChange('preventRecursion', val)} />
            Prevent Further Recursion
            <HelpTooltip text="When active, this entry won't trigger other entries through recursion. Stops unintended cascading activation chains." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.excludeRecursion} onChange={(val) => handleChange('excludeRecursion', val)} />
            Non-recursable
            <HelpTooltip text="This entry can only be activated by direct keyword matches in chat. Other entries cannot recursively trigger it." />
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-ctp-subtext0 shrink-0">
              <Toggle
                checked={entry.delayUntilRecursion > 0}
                onChange={(val) => handleChange('delayUntilRecursion', val ? 1 : 0)}
              />
              Delay Until Recursion
              <HelpTooltip text="The entry stays inactive for this many recursion passes before it can be triggered by other entries." />
            </label>
            {entry.delayUntilRecursion > 0 && (
              <input
                type="number"
                min={1}
                value={entry.delayUntilRecursion}
                onChange={(e) => handleChange('delayUntilRecursion', Number(e.target.value))}
                className={`${inputClass} w-16`}
              />
            )}
          </div>
        </>
      ),
    },
    {
      key: 'Inclusion Group',
      label: 'Inclusion Group',
      stOnly: true,
      content: (
        <>
          <Field label="Inclusion Group" help="A shared label for mutually exclusive entries. When multiple entries in the same group activate, only one is inserted. Leave blank for independent entries.">
            <input
              type="text"
              value={entry.group}
              onChange={(e) => handleChange('group', e.target.value)}
              className={inputClass}
              placeholder="Group name"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
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
                <option value="">Default</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.groupOverride} onChange={(val) => handleChange('groupOverride', val)} />
            Prioritize Inclusion
            <HelpTooltip text="Forces deterministic selection — picks the entry with the highest Insertion Order instead of random weight rolling." />
          </label>
        </>
      ),
    },
    {
      key: 'Scan Settings',
      label: 'Scan Settings',
      stOnly: true,
      content: (
        <>
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
        </>
      ),
    },
    {
      key: 'Match Sources',
      label: 'Match Sources',
      stOnly: true,
      content: (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchPersonaDescription} onChange={(val) => handleChange('matchPersonaDescription', val)} />
            Persona Description
            <HelpTooltip text="Scan the user's persona description for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchCharacterDescription} onChange={(val) => handleChange('matchCharacterDescription', val)} />
            Char Description
            <HelpTooltip text="Scan the character's description field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchCharacterPersonality} onChange={(val) => handleChange('matchCharacterPersonality', val)} />
            Char Personality
            <HelpTooltip text="Scan the character's personality field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchCharacterDepthPrompt} onChange={(val) => handleChange('matchCharacterDepthPrompt', val)} />
            Depth Prompt
            <HelpTooltip text="Scan the character's depth prompt / author's note field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchScenario} onChange={(val) => handleChange('matchScenario', val)} />
            Scenario
            <HelpTooltip text="Scan the scenario field for trigger keywords." />
          </label>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.matchCreatorNotes} onChange={(val) => handleChange('matchCreatorNotes', val)} />
            Creator Notes
            <HelpTooltip text="Scan the creator notes field for trigger keywords." />
          </label>
        </div>
      ),
    },
    {
      key: 'Triggers',
      label: 'Triggers',
      stOnly: true,
      content: (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-ctp-subtext0 flex items-center">
            Generation Types
            <HelpTooltip text="Restrict activation to specific generation types. If none are selected, the entry activates for all generation types." />
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TRIGGER_OPTIONS.map((trigger) => {
              const active = entry.triggers.includes(trigger)
              return (
                <button
                  key={trigger}
                  onClick={() => handleTriggerToggle(trigger)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    active
                      ? 'bg-ctp-mauve text-ctp-base font-medium'
                      : 'bg-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface2 hover:text-ctp-text'
                  }`}
                >
                  {trigger}
                </button>
              )
            })}
          </div>
        </div>
      ),
    },
    {
      key: 'Char Filter',
      label: 'Char Filter',
      stOnly: true,
      content: (
        <>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle
              checked={entry.characterFilter.isExclude}
              onChange={(val) => handleChange('characterFilter', { ...entry.characterFilter, isExclude: val })}
            />
            Exclude (block listed characters instead of allow)
            <HelpTooltip text="When checked, the character list becomes a blocklist — the entry activates for all characters except those named." />
          </label>
          <Field label="Character Names" help="Characters this filter applies to. In allowlist mode, only these characters can trigger the entry; in exclude mode, these characters are blocked.">
            <KeywordInput
              value={entry.characterFilter.names}
              onChange={(names) => handleChange('characterFilter', { ...entry.characterFilter, names })}
              placeholder="CharacterName…"
            />
          </Field>
          <Field label="Character Tags" help="Filter by character tags instead of names. Works alongside the character names list.">
            <KeywordInput
              variant="secondary"
              value={entry.characterFilter.tags}
              onChange={(tags) => handleChange('characterFilter', { ...entry.characterFilter, tags })}
              placeholder="tag…"
            />
          </Field>
        </>
      ),
    },
    {
      key: 'Advanced',
      label: 'Advanced',
      stOnly: true,
      content: (
        <>
          <Field label="Automation ID" help="Connects this entry to an STscript in Quick Replies. When the entry activates, the matching script runs automatically.">
            <input
              type="text"
              value={entry.automationId}
              onChange={(e) => handleChange('automationId', e.target.value)}
              className={inputClass}
              placeholder="Automation ID"
            />
          </Field>
          <Field label="Display Index" help="Controls the visual sort order of this entry in SillyTavern's World Info editor. Does not affect activation or injection.">
            <input
              type="number"
              value={entry.displayIndex ?? ''}
              onChange={(e) => handleChange('displayIndex', e.target.value === '' ? null : Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Toggle checked={entry.ignoreBudget} onChange={(val) => handleChange('ignoreBudget', val)} />
            Ignore Budget
            <HelpTooltip text="Entry bypasses the token budget limit, ensuring it's always inserted regardless of how much context is used. Use sparingly for critical lore." />
          </label>
        </>
      ),
    },
  ], [entry, strategy, handleChange, handleSecondaryKeysChange, handleStrategyChange, handleTriggerToggle, isRoleCall, editorFormatView, setEditorFormatView, handleRoleCallPositionChange])

  if (layout === 'quadrant') {
    return (
      <QuadrantLayout
        nameField={nameField}
        contentField={contentField}
        fieldGroups={
          <CategoryPane
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />
        }
        renderBottomLeft={renderBottomLeft}
        renderBottomRight={renderBottomRight}
      />
    )
  }

  if (layout === 'wide') {
    return (
      <WideLayout
        entryId={entryId}
        graph={graph}
        onNavigate={onNavigate}
        nameField={nameField}
        contentField={contentField}
        fieldGroups={fieldGroups}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto text-sm">
      <FieldGroup label="Identity">
        {nameField}
        {contentField}
      </FieldGroup>
      {fieldGroups}
    </div>
  )
}
