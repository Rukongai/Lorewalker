import { useCallback, useState, useMemo } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE, useDerivedState } from '@/hooks/useDerivedState'
import type { WorkingEntry } from '@/types'
import { estimateTokenCount } from '@/lib/token-estimate'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { ActivationLinks } from './ActivationLinks'
import { RCActivationSection } from './RCActivationSection'
import { FieldGroup, Field, inputClass } from '@/features/editor/primitives'
import { ContentField } from '@/features/editor/ContentField'
import { CategoryAssign } from '@/features/editor/CategoryAssign'
import { ActivationFields } from '@/features/editor/fields/ActivationFields'
import { PriorityFields } from '@/features/editor/fields/PriorityFields'
import { TimedEffectFields } from '@/features/editor/fields/TimedEffectFields'
import { RecursionFields } from '@/features/editor/fields/RecursionFields'
import { GroupFields } from '@/features/editor/fields/GroupFields'
import { ScanOverrideFields } from '@/features/editor/fields/ScanOverrideFields'
import { MatchSourceFields } from '@/features/editor/fields/MatchSourceFields'
import { CharFilterFields } from '@/features/editor/fields/CharFilterFields'
import { TriggersFields } from '@/features/editor/fields/TriggersFields'
import { AdvancedFields } from '@/features/editor/fields/AdvancedFields'
import { BudgetFields } from '@/features/editor/fields/BudgetFields'

function CategoryPane({
  categories,
  selected,
  onSelect,
}: {
  categories: Array<{ key: string; label: string; content: React.ReactNode }>
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
          </button>
        ))}
      </div>
      {/* Right: selected category fields */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-ctp-subtext0 pb-1">
          {active.label}
        </p>
        {active.content}
      </div>
    </div>
  )
}

interface EntryEditorProps {
  entryId: string
  layout?: 'single' | 'wide' | 'quadrant'
  onNavigate?: (entryId: string) => void
  renderBottomMiddleHeader?: () => React.ReactNode
  renderBottomRightHeader?: () => React.ReactNode
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
  renderBottomMiddleHeader,
  renderBottomRightHeader,
  renderBottomLeft,
  renderBottomRight,
}: {
  nameField: React.ReactNode
  contentField: React.ReactNode
  fieldGroups: React.ReactNode
  renderBottomMiddleHeader?: () => React.ReactNode
  renderBottomRightHeader?: () => React.ReactNode
  renderBottomLeft?: () => React.ReactNode
  renderBottomRight?: () => React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Top row: left 60% name+content / right 40% field groups */}
      <div className="flex overflow-hidden border-b border-ctp-surface1" style={{ flex: '40 1 0' }}>
        <div className="border-r border-ctp-surface1 overflow-y-auto p-3 space-y-3" style={{ width: '60%' }}>
          {nameField}
          {contentField}
        </div>
        <div className="overflow-hidden" style={{ width: '40%' }}>
          {fieldGroups}
        </div>
      </div>

      {/* Bottom section: 3-column CSS Grid — col 0+1 = 1.5fr each (matches ActivationLinks 50/50), col 2 = 2fr */}
      <div
        className="overflow-hidden"
        style={{
          flex: '60 1 0',
          display: 'grid',
          gridTemplateColumns: '1.5fr 1.5fr 2fr',
          gridTemplateRows: 'auto 1fr',
        }}
      >
        {/* Header row — 3 cells, same grid row = same height automatically */}
        <div className="border-b border-r border-ctp-surface1 overflow-hidden" />
        <div className="border-b border-r border-ctp-surface1 overflow-hidden">
          {renderBottomMiddleHeader?.()}
        </div>
        <div className="border-b border-ctp-surface1 overflow-hidden">
          {renderBottomRightHeader?.()}
        </div>
        {/* Content row — left spans cols 0+1 to match the 3fr area */}
        <div className="overflow-hidden border-r border-ctp-surface1" style={{ gridColumn: 'span 2' }}>
          {renderBottomLeft?.()}
        </div>
        <div className="overflow-hidden">
          {renderBottomRight?.()}
        </div>
      </div>
    </div>
  )
}

export function EntryEditor({ entryId, layout = 'single', onNavigate, renderBottomMiddleHeader, renderBottomRightHeader, renderBottomLeft, renderBottomRight }: EntryEditorProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entry = activeStore((s) => s.entries.find((e) => e.id === entryId))
  const bookMatchWholeWords = activeStore((s) => s.bookMeta.matchWholeWords)
  const { graph } = useDerivedState(activeTabId ?? '')

  const activeFormat = activeStore((s) => s.activeFormat)
  const isRoleCall = activeFormat === 'rolecall'
  const isSillyTavern = activeFormat !== 'rolecall' && activeFormat !== 'ccv3'
  const isPlatform = isRoleCall || isSillyTavern

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
      realStore.getState().updateEntry(entryId, changes)
      if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
    },
    [realStore, entryId, activeTabId]
  )

  const handleUpdate = useCallback((patch: Partial<WorkingEntry>) => {
    if (!realStore) return
    realStore.getState().updateEntry(entryId, patch)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, entryId, activeTabId])

  const handleSetCategory = useCallback((category: string | undefined) => {
    if (!realStore) return
    realStore.getState().setEntryCategory(entryId, category)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, entryId, activeTabId])

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Select an entry to edit</p>
      </div>
    )
  }

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
      <CategoryAssign userCategory={entry.userCategory} onSetCategory={handleSetCategory} />
    </>
  )

  const contentField = (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-ctp-subtext0 flex items-center">
        {`Content (${entry.tokenCount} tokens)`}
        <HelpTooltip text="The text injected into the AI's context when this entry activates. Supports Markdown-style formatting depending on your AI platform." />
      </span>
      <ContentField
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
      <FieldGroup label="Activation" rcOnly={isRoleCall}>
        {isRoleCall
          ? <RCActivationSection entry={entry} onChange={handleUpdate} />
          : <ActivationFields entry={entry} onChange={handleUpdate} />}
      </FieldGroup>

      <FieldGroup label="Insertion">
        <PriorityFields entry={entry} isRoleCall={isRoleCall} onChange={handleUpdate} />
      </FieldGroup>

      {isPlatform && (
        <FieldGroup label="Timed Effects" defaultCollapsed>
          <TimedEffectFields entry={entry} isSillyTavern={isSillyTavern} onChange={handleUpdate} />
        </FieldGroup>
      )}

      {isPlatform && (
        <FieldGroup label="Recursion" defaultCollapsed>
          <RecursionFields entry={entry} onChange={handleUpdate} />
        </FieldGroup>
      )}

      {isPlatform && (
        <FieldGroup label="Inclusion Group" defaultCollapsed>
          <GroupFields entry={entry} isSillyTavern={isSillyTavern} onChange={handleUpdate} />
        </FieldGroup>
      )}

      {isPlatform && (
        <FieldGroup label="Scan Settings" defaultCollapsed>
          <ScanOverrideFields entry={entry} onChange={handleUpdate} />
        </FieldGroup>
      )}

      {isPlatform && (
        <FieldGroup label="Match Sources" defaultCollapsed>
          <MatchSourceFields entry={entry} isSillyTavern={isSillyTavern} onChange={handleUpdate} />
        </FieldGroup>
      )}

      {isSillyTavern && (
        <FieldGroup label="Triggers" stOnly defaultCollapsed>
          <TriggersFields triggers={entry.triggers} onChange={(triggers) => handleUpdate({ triggers })} />
        </FieldGroup>
      )}

      {isPlatform && (
        <FieldGroup label="Character Filter" defaultCollapsed>
          <CharFilterFields entry={entry} onChange={handleUpdate} />
        </FieldGroup>
      )}

      {isSillyTavern && (
        <FieldGroup label="Budget" stOnly defaultCollapsed>
          <BudgetFields entry={entry} onChange={handleUpdate} />
        </FieldGroup>
      )}

      {isSillyTavern && (
        <FieldGroup label="Advanced" stOnly defaultCollapsed>
          <AdvancedFields entry={entry} onChange={handleUpdate} />
        </FieldGroup>
      )}
    </>
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const categories = useMemo(() => {
    const allCategories: Array<{ key: string; label: string; content: React.ReactNode }> = [
      {
        key: 'Activation',
        label: 'Activation',
        content: isRoleCall
          ? <RCActivationSection entry={entry} onChange={handleUpdate} />
          : <ActivationFields entry={entry} onChange={handleUpdate} />,
      },
      {
        key: 'Insertion',
        label: 'Insertion',
        content: <PriorityFields entry={entry} isRoleCall={isRoleCall} onChange={handleUpdate} />,
      },
      ...(isPlatform ? [
        {
          key: 'Timed Effects',
          label: 'Timed Effects',
          content: <TimedEffectFields entry={entry} isSillyTavern={isSillyTavern} onChange={handleUpdate} />,
        },
        {
          key: 'Recursion',
          label: 'Recursion',
          content: <RecursionFields entry={entry} onChange={handleUpdate} />,
        },
        {
          key: 'Inclusion Group',
          label: 'Inclusion Group',
          content: <GroupFields entry={entry} isSillyTavern={isSillyTavern} onChange={handleUpdate} />,
        },
        {
          key: 'Scan Settings',
          label: 'Scan Settings',
          content: <ScanOverrideFields entry={entry} onChange={handleUpdate} />,
        },
        {
          key: 'Match Sources',
          label: 'Match Sources',
          content: <MatchSourceFields entry={entry} isSillyTavern={isSillyTavern} onChange={handleUpdate} />,
        },
        {
          key: 'Char Filter',
          label: 'Char Filter',
          content: <CharFilterFields entry={entry} onChange={handleUpdate} />,
        },
      ] : []),
      ...(isSillyTavern ? [
        {
          key: 'Triggers',
          label: 'Triggers',
          content: <TriggersFields triggers={entry.triggers} onChange={(triggers) => handleUpdate({ triggers })} />,
        },
        {
          key: 'Budget',
          label: 'Budget',
          content: <BudgetFields entry={entry} onChange={handleUpdate} />,
        },
        {
          key: 'Advanced',
          label: 'Advanced',
          content: <AdvancedFields entry={entry} onChange={handleUpdate} />,
        },
      ] : []),
    ]
    return allCategories
  }, [entry, isRoleCall, isSillyTavern, isPlatform, handleUpdate])

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
        renderBottomMiddleHeader={renderBottomMiddleHeader}
        renderBottomRightHeader={renderBottomRightHeader}
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
