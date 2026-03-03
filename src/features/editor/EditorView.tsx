import { lazy, Suspense } from 'react'
import type { WorkingEntry, BookMeta, LorebookFormat, RecursionGraph } from '@/types'
import type { ConnectionRow } from '@/features/health'
import { FieldGroup, Field, inputClass } from './primitives'
import { ContentField } from './ContentField'
import { CategoryAssign } from './CategoryAssign'
import { ActivationFields } from './fields/ActivationFields'
import { PriorityFields } from './fields/PriorityFields'
import { TimedEffectFields } from './fields/TimedEffectFields'
import { RecursionFields } from './fields/RecursionFields'
import { GroupFields } from './fields/GroupFields'
import { ScanOverrideFields } from './fields/ScanOverrideFields'
import { MatchSourceFields } from './fields/MatchSourceFields'
import { CharFilterFields } from './fields/CharFilterFields'
import { TriggersFields } from './fields/TriggersFields'
import { BudgetFields } from './fields/BudgetFields'
import { AdvancedFields } from './fields/AdvancedFields'
import { ConnectionsList } from '@/features/health'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'

const LazyRCEntryFields = lazy(
  () => import('./variants/rolecall/RCEntryFields').then(m => ({ default: m.RCEntryFields }))
)
const LazySTEntryFields = lazy(
  () => import('./variants/sillytavern/STEntryFields').then(m => ({ default: m.STEntryFields }))
)
const LazySTBookMetaFields = lazy(
  () => import('./variants/sillytavern/STBookMetaFields').then(m => ({ default: m.STBookMetaFields }))
)
const LazyRCBookMetaFields = lazy(
  () => import('./variants/rolecall/RCBookMetaFields').then(m => ({ default: m.RCBookMetaFields }))
)

const FORMAT_OPTIONS: { value: LorebookFormat; label: string }[] = [
  { value: 'sillytavern', label: 'SillyTavern' },
  { value: 'ccv3', label: 'CCv3' },
  { value: 'rolecall', label: 'RoleCall' },
]

const EMPTY_GRAPH: RecursionGraph = {
  edges: new Map(),
  reverseEdges: new Map(),
  edgeMeta: new Map(),
}

export interface EditorViewProps {
  scope: 'lorebook' | 'entry'
  activeFormat: LorebookFormat

  // Entry scope
  entry?: WorkingEntry
  graph?: RecursionGraph
  onEntryChange?: (patch: Partial<WorkingEntry>) => void
  connections?: { incoming: ConnectionRow[]; outgoing: ConnectionRow[] }
  onNavigate?: (entryId: string) => void

  // Lorebook scope
  bookMeta?: BookMeta
  onBookMetaChange?: <K extends keyof BookMeta>(field: K, value: BookMeta[K]) => void
  onFormatChange?: (format: LorebookFormat) => void
}

export function EditorView({
  scope,
  activeFormat,
  entry,
  graph,
  onEntryChange,
  connections,
  onNavigate,
  bookMeta,
  onBookMetaChange,
  onFormatChange,
}: EditorViewProps) {
  const isRoleCall = activeFormat === 'rolecall'
  const isSillyTavern = activeFormat !== 'rolecall' && activeFormat !== 'ccv3'
  const isPlatform = isRoleCall || isSillyTavern

  if (scope === 'entry') {
    if (!entry || !onEntryChange) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-ctp-overlay1">Select an entry to edit</p>
        </div>
      )
    }

    const effectiveGraph = graph ?? EMPTY_GRAPH

    return (
      <div className="flex-1 overflow-y-auto text-sm space-y-0">
        {/* Name */}
        <div className="px-3 pt-3 pb-1 space-y-2">
          <Field label="Name" help="Display label for this entry in the lorebook editor. Not injected into the AI's context.">
            <input
              type="text"
              value={entry.name}
              onChange={(e) => onEntryChange({ name: e.target.value })}
              className={inputClass}
              placeholder="Entry name"
            />
          </Field>

          {isRoleCall && (
            <Field label="Notes" help="RoleCall comment field — a separate notes area distinct from the entry title.">
              <input
                type="text"
                value={entry.rolecallComment ?? ''}
                onChange={(e) => onEntryChange({ rolecallComment: e.target.value || undefined })}
                className={inputClass}
                placeholder="Optional notes…"
              />
            </Field>
          )}

          <CategoryAssign
            userCategory={entry.userCategory}
            onSetCategory={(category) => onEntryChange({ userCategory: category })}
          />

          {/* Content */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ctp-subtext0 flex items-center">
              {`Content (${entry.tokenCount} tokens)`}
              <HelpTooltip text="The text injected into the AI's context when this entry activates. Supports Markdown-style formatting depending on your AI platform." />
            </span>
            <ContentField
              value={entry.content}
              entryId={entry.id}
              graph={effectiveGraph}
              onChange={(v) => onEntryChange({ content: v })}
              inputClass={inputClass}
              preventRecursion={entry.preventRecursion}
              matchWholeWords={false}
            />
          </div>
        </div>

        {/* Activation */}
        <FieldGroup label="Activation" rcOnly={isRoleCall}>
          {isRoleCall ? (
            <Suspense fallback={null}>
              <LazyRCEntryFields entry={entry} onChange={onEntryChange} />
            </Suspense>
          ) : (
            <ActivationFields entry={entry} onChange={onEntryChange} />
          )}
        </FieldGroup>

        {/* Insertion / Priority */}
        <FieldGroup label="Insertion">
          <PriorityFields entry={entry} isRoleCall={isRoleCall} onChange={onEntryChange} />
        </FieldGroup>

        {isPlatform && (
          <FieldGroup label="Timed Effects" defaultCollapsed>
            <TimedEffectFields entry={entry} isSillyTavern={isSillyTavern} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Recursion" defaultCollapsed>
            <RecursionFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Inclusion Group" defaultCollapsed>
            <GroupFields entry={entry} isSillyTavern={isSillyTavern} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Scan Settings" defaultCollapsed>
            <ScanOverrideFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Match Sources" defaultCollapsed>
            <MatchSourceFields entry={entry} isSillyTavern={isSillyTavern} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Character Filter" defaultCollapsed>
            <CharFilterFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isSillyTavern && (
          <FieldGroup label="Triggers" stOnly defaultCollapsed>
            <TriggersFields triggers={entry.triggers} onChange={(triggers) => onEntryChange({ triggers })} />
          </FieldGroup>
        )}

        {isSillyTavern && (
          <FieldGroup label="Budget" stOnly defaultCollapsed>
            <BudgetFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isSillyTavern && (
          <FieldGroup label="Advanced" stOnly defaultCollapsed>
            <AdvancedFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isSillyTavern && (
          <Suspense fallback={null}>
            <LazySTEntryFields entry={entry} onChange={onEntryChange} />
          </Suspense>
        )}

        {connections && (
          <FieldGroup label="Connections" defaultCollapsed>
            <ConnectionsList
              incoming={connections.incoming}
              outgoing={connections.outgoing}
              onNavigate={onNavigate}
            />
          </FieldGroup>
        )}
      </div>
    )
  }

  // Lorebook scope
  if (!bookMeta || !onBookMetaChange) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">No book open</p>
      </div>
    )
  }

  const displayFormat: LorebookFormat =
    isRoleCall ? 'rolecall'
    : activeFormat === 'ccv3' ? 'ccv3'
    : 'sillytavern'

  return (
    <div className="flex-1 overflow-y-auto text-sm">
      {/* Lorebook Format */}
      <FieldGroup label="Lorebook Format">
        <Field
          label="Format"
          help="Controls which platform-specific fields are shown. Does not change the export format."
        >
          <div className="flex rounded border border-ctp-surface1 overflow-hidden">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFormatChange?.(opt.value)}
                className={`flex-1 px-2 py-1 text-xs transition-colors ${
                  displayFormat === opt.value
                    ? 'bg-ctp-accent/30 text-ctp-accent font-medium'
                    : 'bg-ctp-surface0 text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface1'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      </FieldGroup>

      {/* Book Info */}
      <FieldGroup label="Book Info">
        <Field label="Name" help="The display name of this lorebook. Used as a label in the editor only — not injected into the AI's context.">
          <input
            type="text"
            value={bookMeta.name}
            onChange={(e) => onBookMetaChange('name', e.target.value)}
            className={inputClass}
            placeholder="Lorebook name"
          />
        </Field>
        <Field label="Description" help="A brief summary of this lorebook's purpose or content. Shown in the editor only.">
          <textarea
            value={bookMeta.description}
            onChange={(e) => onBookMetaChange('description', e.target.value)}
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
            onChange={(e) => onBookMetaChange('scanDepth', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={bookMeta.caseSensitive} onChange={(val) => onBookMetaChange('caseSensitive', val)} />
          Case-sensitive Keys
          <HelpTooltip text="When on, keywords must match exact letter casing ('Dragon' won't match 'dragon'). Off by default." />
        </label>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={bookMeta.matchWholeWords} onChange={(val) => onBookMetaChange('matchWholeWords', val)} />
          Match Whole Words
          <HelpTooltip text="When on, keywords only match complete words ('ring' won't match 'spring'). Off by default." />
        </label>
      </FieldGroup>

      {/* Budget */}
      <FieldGroup label="Budget" defaultCollapsed>
        <Field label="Context Size" help="Total context window size in tokens. Used to compute the Context % budget. Not exported to the lorebook file.">
          <input
            type="number"
            min={1000}
            value={bookMeta.contextSize}
            onChange={(e) => onBookMetaChange('contextSize', Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Context %" help="Percentage of the total context window reserved for World Info entries. Controls how much lore can be injected before the budget is exhausted.">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={Math.min(100, Math.round((bookMeta.tokenBudget / bookMeta.contextSize) * 100))}
              onChange={(e) => onBookMetaChange('tokenBudget', Math.round((Number(e.target.value) / 100) * bookMeta.contextSize))}
              className={inputClass}
            />
            <span className="text-xs text-ctp-subtext1 shrink-0">%</span>
          </div>
        </Field>
      </FieldGroup>

      {/* Activation */}
      <FieldGroup label="Activation" defaultCollapsed>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={bookMeta.recursiveScan} onChange={(val) => onBookMetaChange('recursiveScan', val)} />
          Recursive Scan
          <HelpTooltip text="When on, newly activated entries are also scanned for keywords, allowing chains of entries to activate each other." />
        </label>
      </FieldGroup>

      {/* ST-specific book meta */}
      {isSillyTavern && (
        <Suspense fallback={null}>
          <LazySTBookMetaFields bookMeta={bookMeta} onChange={onBookMetaChange} />
        </Suspense>
      )}

      {/* RC-specific book meta */}
      {isRoleCall && (
        <Suspense fallback={null}>
          <LazyRCBookMetaFields bookMeta={bookMeta} onChange={onBookMetaChange} />
        </Suspense>
      )}
    </div>
  )
}
