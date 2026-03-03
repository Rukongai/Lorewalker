import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import type { WorkingEntry } from '@/types'
import {
  Field, inputClass,
  ContentField, CategoryAssign,
  ActivationFields, PriorityFields, TimedEffectFields, RecursionFields,
  GroupFields, ScanOverrideFields, MatchSourceFields, CharFilterFields,
  TriggersFields, AdvancedFields,
} from '@/features/editor'
import {
  buildConnectionRows, ConnectionsList, HealthScoreCard, FindingsList,
} from '@/features/health'
import { computeHealthScore } from '@/services/analysis/analysis-service'
import { defaultRubric } from '@/services/analysis/default-rubric'
import { getReachableEntries } from '@/services/graph-service'

const LazyRCEntryFields = lazy(
  () => import('@/features/editor/variants/rolecall/RCEntryFields').then(m => ({ default: m.RCEntryFields }))
)

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
  if (!active) return null
  return (
    <div className="flex h-full">
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
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-ctp-subtext0 pb-1">
          {active.label}
        </p>
        {active.content}
      </div>
    </div>
  )
}

interface EntryWorkspaceProps {
  entryId: string
  onClose: () => void
}

export function EntryWorkspace({ entryId, onClose }: EntryWorkspaceProps) {
  const [currentEntryId, setCurrentEntryId] = useState(entryId)
  const [backStack, setBackStack] = useState<string[]>([])
  const [forwardStack, setForwardStack] = useState<string[]>([])
  const [maxRecursions, setMaxRecursions] = useState(0)

  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const editorDefaults = useWorkspaceStore((s) => s.editorDefaults)
  const setEditorDefaults = useWorkspaceStore((s) => s.setEditorDefaults)

  const [selectedCategory, setSelectedCategory] = useState(
    () => editorDefaults.categoryBehavior === 'remember' ? editorDefaults.lastEditorCategory : 'Activation'
  )

  const { graph, findings, activeRubric } = useDerivedState(activeTabId)

  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const activeFormat = activeStore((s) => s.activeFormat)
  const storeHealthScore = activeStore((s) => s.healthScore)

  const isRoleCall = activeFormat === 'rolecall'
  const isSillyTavern = activeFormat !== 'rolecall' && activeFormat !== 'ccv3'
  const isPlatform = isRoleCall || isSillyTavern

  const entryMap = useMemo(() => new Map(entries.map((e) => [e.id, e.name])), [entries])
  const currentEntry = useMemo(
    () => entries.find((e) => e.id === currentEntryId),
    [entries, currentEntryId]
  )
  const entryFindings = useMemo(
    () => findings.filter((f) => f.entryIds.includes(currentEntryId)),
    [findings, currentEntryId]
  )
  const connections = useMemo(
    () => currentEntry ? buildConnectionRows(currentEntryId, entries, graph) : { incoming: [], outgoing: [] },
    [currentEntryId, entries, graph, currentEntry]
  )
  const reachable = useMemo(
    () => getReachableEntries(currentEntryId, graph, maxRecursions || undefined),
    [currentEntryId, graph, maxRecursions]
  )

  const reachPercent = entries.length > 1
    ? Math.round((reachable.size / (entries.length - 1)) * 100)
    : 0

  const overallScore = storeHealthScore.overall
  const entryScore = useMemo(
    () => computeHealthScore(entryFindings, activeRubric ?? defaultRubric).overall,
    [entryFindings, activeRubric]
  )

  const navigate = useCallback((id: string) => {
    setBackStack((prev) => [...prev, currentEntryId])
    setCurrentEntryId(id)
    setForwardStack([])
  }, [currentEntryId])

  const goBack = useCallback(() => {
    if (backStack.length === 0) return
    const prev = backStack[backStack.length - 1]
    setBackStack((s) => s.slice(0, -1))
    setForwardStack((s) => [currentEntryId, ...s])
    setCurrentEntryId(prev)
  }, [backStack, currentEntryId])

  const goForward = useCallback(() => {
    if (forwardStack.length === 0) return
    const next = forwardStack[0]
    setBackStack((s) => [...s, currentEntryId])
    setForwardStack((s) => s.slice(1))
    setCurrentEntryId(next)
  }, [forwardStack, currentEntryId])

  const handleEntryChange = useCallback((patch: Partial<WorkingEntry>) => {
    if (!realStore || !currentEntry) return
    realStore.getState().updateEntry(currentEntryId, patch)
    if (activeTabId) useWorkspaceStore.getState().markDirty(activeTabId, true)
  }, [realStore, currentEntry, currentEntryId, activeTabId])

  const handleCategorySelect = useCallback((key: string) => {
    setSelectedCategory(key)
    if (editorDefaults.categoryBehavior === 'remember') {
      setEditorDefaults({ ...editorDefaults, lastEditorCategory: key })
    }
  }, [editorDefaults, setEditorDefaults])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const categories = useMemo(() => {
    if (!currentEntry) return []
    return [
      {
        key: 'Activation',
        label: 'Activation',
        content: isRoleCall ? (
          <Suspense fallback={null}>
            <LazyRCEntryFields entry={currentEntry} onChange={handleEntryChange} />
          </Suspense>
        ) : (
          <ActivationFields entry={currentEntry} onChange={handleEntryChange} />
        ),
      },
      {
        key: 'Insertion',
        label: 'Insertion',
        content: <PriorityFields entry={currentEntry} isRoleCall={isRoleCall} onChange={handleEntryChange} />,
      },
      ...(isPlatform ? [
        {
          key: 'Timed Effects',
          label: 'Timed Effects',
          content: <TimedEffectFields entry={currentEntry} isSillyTavern={isSillyTavern} onChange={handleEntryChange} />,
        },
        {
          key: 'Recursion',
          label: 'Recursion',
          content: <RecursionFields entry={currentEntry} onChange={handleEntryChange} />,
        },
        {
          key: 'Inclusion Group',
          label: 'Inclusion Group',
          content: <GroupFields entry={currentEntry} isSillyTavern={isSillyTavern} onChange={handleEntryChange} />,
        },
        {
          key: 'Scan Settings',
          label: 'Scan Settings',
          content: <ScanOverrideFields entry={currentEntry} onChange={handleEntryChange} />,
        },
        {
          key: 'Match Sources',
          label: 'Match Sources',
          content: <MatchSourceFields entry={currentEntry} isSillyTavern={isSillyTavern} onChange={handleEntryChange} />,
        },
        {
          key: 'Char Filter',
          label: 'Char Filter',
          content: <CharFilterFields entry={currentEntry} onChange={handleEntryChange} />,
        },
      ] : []),
      ...(isSillyTavern ? [
        {
          key: 'Triggers',
          label: 'Triggers',
          content: <TriggersFields triggers={currentEntry.triggers} onChange={(triggers) => handleEntryChange({ triggers })} />,
        },
        {
          key: 'Advanced',
          label: 'Advanced',
          content: <AdvancedFields entry={currentEntry} onChange={handleEntryChange} />,
        },
      ] : []),
    ]
  }, [currentEntry, isRoleCall, isSillyTavern, isPlatform, handleEntryChange])

  // z-50: capture Escape, stop propagation so LorebookWorkspace (z-40) doesn't also close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', minWidth: '640px', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-ctp-surface1 shrink-0">
          <div className="flex items-center gap-1">
            <Tooltip
              text={backStack.length > 0
                ? `Back: ${entryMap.get(backStack[backStack.length - 1]) ?? '...'}`
                : 'No history'}
            >
              <button
                onClick={goBack}
                disabled={backStack.length === 0}
                className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
            </Tooltip>
            <Tooltip
              text={forwardStack.length > 0
                ? `Forward: ${entryMap.get(forwardStack[0]) ?? '...'}`
                : 'No forward history'}
            >
              <button
                onClick={goForward}
                disabled={forwardStack.length === 0}
                className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </Tooltip>
            <span className="ml-2 text-sm font-medium text-ctp-text">Entry</span>
          </div>
          <Tooltip text="Close (Esc)">
            <button
              onClick={onClose}
              className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        {!currentEntry ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-ctp-overlay1">Select an entry</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden text-sm">
            {/* Top row — 40% of height */}
            <div style={{ flex: '40 1 0' }} className="flex overflow-hidden border-b border-ctp-surface1">
              {/* Top-left: Name + CategoryAssign + Content */}
              <div style={{ width: '60%' }} className="border-r border-ctp-surface1 overflow-y-auto p-3 space-y-3">
                <Field label="Name" help="Display label for this entry in the lorebook editor. Not injected into the AI's context.">
                  <input
                    type="text"
                    value={currentEntry.name}
                    onChange={(e) => handleEntryChange({ name: e.target.value })}
                    className={inputClass}
                    placeholder="Entry name"
                  />
                </Field>
                {isRoleCall && (
                  <Field label="Notes" help="RoleCall comment field — a separate notes area distinct from the entry title.">
                    <input
                      type="text"
                      value={currentEntry.rolecallComment ?? ''}
                      onChange={(e) => handleEntryChange({ rolecallComment: e.target.value || undefined })}
                      className={inputClass}
                      placeholder="Optional notes…"
                    />
                  </Field>
                )}
                <CategoryAssign
                  userCategory={currentEntry.userCategory}
                  onSetCategory={(category) => handleEntryChange({ userCategory: category })}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-ctp-subtext0 flex items-center">
                    {`Content (${currentEntry.tokenCount} tokens)`}
                    <HelpTooltip text="The text injected into the AI's context when this entry activates. Supports Markdown-style formatting depending on your AI platform." />
                  </span>
                  <ContentField
                    value={currentEntry.content}
                    entryId={currentEntry.id}
                    graph={graph}
                    onChange={(v) => handleEntryChange({ content: v })}
                    inputClass={inputClass}
                    preventRecursion={currentEntry.preventRecursion}
                    matchWholeWords={false}
                  />
                </div>
              </div>

              {/* Top-right: CategoryPane */}
              <div style={{ width: '40%' }} className="overflow-hidden">
                <CategoryPane
                  categories={categories}
                  selected={selectedCategory}
                  onSelect={handleCategorySelect}
                />
              </div>
            </div>

            {/* Bottom section — 60% of height, 3-column grid */}
            <div
              style={{
                flex: '60 1 0',
                display: 'grid',
                gridTemplateColumns: '1.5fr 1.5fr 2fr',
                gridTemplateRows: 'auto 1fr',
              }}
              className="overflow-hidden"
            >
              {/* Header row cell 1 (empty) */}
              <div className="border-b border-r border-ctp-surface1" />

              {/* Header row cell 2: Reach + Recursions */}
              <div className="border-b border-r border-ctp-surface1">
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-ctp-overlay1 uppercase tracking-wider">Reach</span>
                    {reachable.size > 0 ? (
                      <span className={`text-xs ${reachPercent > 75 ? 'text-ctp-red' : reachPercent > 50 ? 'text-ctp-yellow' : 'text-ctp-subtext0'}`}>
                        ~{reachPercent}%{' '}
                        <span className="text-ctp-overlay0">
                          ({reachable.size} of {entries.length - 1})
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-ctp-overlay0">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-ctp-overlay1 uppercase tracking-wider">Recursions</span>
                    <HelpTooltip text="Max recursion hops to follow (0 = unlimited)" />
                    <input
                      type="number"
                      min={0}
                      value={maxRecursions === 0 ? '' : maxRecursions}
                      placeholder="∞"
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        setMaxRecursions(isNaN(val) || val < 0 ? 0 : val)
                      }}
                      className="w-10 text-xs text-center bg-ctp-surface0 border border-ctp-surface1 rounded px-1 py-0.5 text-ctp-subtext0 placeholder:text-ctp-overlay0 focus:outline-none focus:border-ctp-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Header row cell 3: Overall + Entry score cards */}
              <div className="border-b border-ctp-surface1">
                <div className="grid grid-cols-2 divide-x divide-ctp-surface1">
                  <div className="px-3 py-2">
                    <p className="text-[10px] text-ctp-overlay1 uppercase tracking-wider mb-1">Overall Health</p>
                    <HealthScoreCard score={overallScore} />
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] text-ctp-overlay1 uppercase tracking-wider mb-1">Entry Health</p>
                    <HealthScoreCard score={entryScore} />
                  </div>
                </div>
              </div>

              {/* Content row: ConnectionsList spans 2 columns */}
              <div style={{ gridColumn: 'span 2' }} className="overflow-hidden border-r border-ctp-surface1">
                <ConnectionsList
                  incoming={connections.incoming}
                  outgoing={connections.outgoing}
                  onNavigate={navigate}
                />
              </div>

              {/* Content row: Issues / Findings pane */}
              <div className="overflow-hidden flex flex-col">
                <div className="px-3 py-1.5 border-b border-ctp-surface0 shrink-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
                    Issues for this entry ({entryFindings.length})
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <FindingsList findings={entryFindings} onSelectEntry={navigate} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
