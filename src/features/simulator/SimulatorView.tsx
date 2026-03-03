import { useState } from 'react'
import { Play, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import type {
  WorkingEntry,
  BookMeta,
  RecursionGraph,
  SimulatorState,
  SimulationSettings,
  SimMessage,
} from '@/types'
import { MessageComposer } from './MessageComposer'
import { ActivationResultList } from './ActivationResultList'
import { RecursionTraceView } from './RecursionTraceView'
import { EntryActivationProfile } from './EntryActivationProfile'
import { ReachAnalysis } from './ReachAnalysis'

export interface SimulatorViewProps {
  scope: 'lorebook' | 'entry'
  entries: WorkingEntry[]
  bookMeta: BookMeta
  simulatorState: SimulatorState
  graph: RecursionGraph
  entry?: WorkingEntry
  onRunSimulation: () => void
  onUpdateSettings: (patch: Partial<SimulationSettings>) => void
  onSetMessages: (messages: SimMessage[]) => void
  onEntrySelect?: (entryId: string) => void
  onEntryOpen?: (entryId: string) => void
}

export function SimulatorView({
  scope,
  entries,
  bookMeta,
  simulatorState,
  graph,
  entry,
  onRunSimulation,
  onUpdateSettings,
  onSetMessages,
  onEntrySelect,
  onEntryOpen,
}: SimulatorViewProps) {
  if (scope === 'entry' && !entry) return null

  if (scope === 'lorebook') {
    return (
      <LorebookScopeView
        entries={entries}
        bookMeta={bookMeta}
        simulatorState={simulatorState}
        onRunSimulation={onRunSimulation}
        onUpdateSettings={onUpdateSettings}
        onSetMessages={onSetMessages}
        onEntrySelect={onEntrySelect}
        onEntryOpen={onEntryOpen}
      />
    )
  }

  return (
    <EntryScopeView
      entry={entry!}
      entries={entries}
      simulatorState={simulatorState}
      graph={graph}
      bookMeta={bookMeta}
      onEntrySelect={onEntrySelect}
    />
  )
}

// ---- Lorebook scope ----

interface LorebookScopeViewProps {
  entries: WorkingEntry[]
  bookMeta: BookMeta
  simulatorState: SimulatorState
  onRunSimulation: () => void
  onUpdateSettings: (patch: Partial<SimulationSettings>) => void
  onSetMessages: (messages: SimMessage[]) => void
  onEntrySelect?: (entryId: string) => void
  onEntryOpen?: (entryId: string) => void
}

function LorebookScopeView({
  entries,
  bookMeta,
  simulatorState,
  onRunSimulation,
  onUpdateSettings,
  onSetMessages,
  onEntrySelect,
  onEntryOpen,
}: LorebookScopeViewProps) {
  const [recursionOpen, setRecursionOpen] = useState(false)
  const { settings, messages, lastResult } = simulatorState

  function resetToDefaults() {
    onUpdateSettings({
      defaultScanDepth: bookMeta.scanDepth,
      defaultTokenBudget: bookMeta.tokenBudget,
      defaultCaseSensitive: bookMeta.caseSensitive,
      defaultMatchWholeWords: bookMeta.matchWholeWords,
      defaultMaxRecursionSteps: bookMeta.maxRecursionSteps,
      defaultIncludeNames: bookMeta.includeNames,
    })
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Messages */}
      <section>
        <SectionHeader>Messages</SectionHeader>
        <MessageComposer messages={messages} onChange={onSetMessages} />
      </section>

      {/* Settings */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionHeader>Settings</SectionHeader>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1 text-[10px] text-ctp-overlay1 hover:text-ctp-subtext0 transition-colors"
          >
            <RotateCcw size={10} />
            Reset to book defaults
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <NumberField
            label="Scan depth"
            value={settings.defaultScanDepth}
            onChange={(v) => onUpdateSettings({ defaultScanDepth: v })}
          />
          <NumberField
            label="Token budget"
            value={settings.defaultTokenBudget}
            onChange={(v) => onUpdateSettings({ defaultTokenBudget: v })}
          />
          <NumberField
            label="Max recursion steps"
            value={settings.defaultMaxRecursionSteps}
            onChange={(v) => onUpdateSettings({ defaultMaxRecursionSteps: v })}
          />
          <CheckField
            label="Case sensitive"
            checked={settings.defaultCaseSensitive}
            onChange={(v) => onUpdateSettings({ defaultCaseSensitive: v })}
          />
          <CheckField
            label="Match whole words"
            checked={settings.defaultMatchWholeWords}
            onChange={(v) => onUpdateSettings({ defaultMatchWholeWords: v })}
          />
          <CheckField
            label="Include names"
            checked={settings.defaultIncludeNames}
            onChange={(v) => onUpdateSettings({ defaultIncludeNames: v })}
          />
        </div>
      </section>

      {/* Run button */}
      <button
        onClick={onRunSimulation}
        className="flex items-center justify-center gap-2 py-2 rounded bg-ctp-accent text-ctp-base text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Play size={14} />
        Run simulation
      </button>

      {/* Results */}
      {lastResult && (
        <section>
          <SectionHeader>Results</SectionHeader>
          <ActivationResultList
            result={lastResult}
            entries={entries}
            onSelectEntry={onEntrySelect ?? (() => {})}
            onOpenEntry={onEntryOpen}
            compact
          />
        </section>
      )}

      {/* Recursion trace */}
      {lastResult && lastResult.recursionTrace.length > 0 && (
        <section>
          <button
            onClick={() => setRecursionOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 hover:text-ctp-subtext0 transition-colors mb-1"
          >
            {recursionOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Recursion trace ({lastResult.recursionTrace.length} step
            {lastResult.recursionTrace.length !== 1 ? 's' : ''})
          </button>
          {recursionOpen && (
            <RecursionTraceView steps={lastResult.recursionTrace} entries={entries} />
          )}
        </section>
      )}
    </div>
  )
}

// ---- Entry scope ----

interface EntryScopeViewProps {
  entry: WorkingEntry
  entries: WorkingEntry[]
  simulatorState: SimulatorState
  graph: RecursionGraph
  bookMeta: BookMeta
  onEntrySelect?: (entryId: string) => void
}

function EntryScopeView({
  entry,
  entries,
  simulatorState,
  graph,
  bookMeta,
  onEntrySelect,
}: EntryScopeViewProps) {
  const { lastResult, conversationHistory } = simulatorState

  const historyForEntry = conversationHistory.filter((step) =>
    step.result.activatedEntries.some((ae) => ae.entryId === entry.id),
  )

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Activation profile */}
      <section>
        <SectionHeader>Activation profile</SectionHeader>
        <EntryActivationProfile entry={entry} entries={entries} result={lastResult} />
      </section>

      {/* Reach analysis */}
      <section>
        <SectionHeader>Reach analysis</SectionHeader>
        <ReachAnalysis
          entry={entry}
          entries={entries}
          graph={graph}
          maxRecursionSteps={bookMeta.maxRecursionSteps}
          onEntrySelect={onEntrySelect}
        />
      </section>

      {/* Activation history */}
      <section>
        <SectionHeader>Activation history</SectionHeader>
        {historyForEntry.length === 0 ? (
          <p className="text-xs text-ctp-overlay1 py-2">
            {conversationHistory.length === 0
              ? 'Run a simulation to see activation history.'
              : 'This entry was not activated in any simulated messages.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {historyForEntry.map((step) => (
              <div
                key={step.messageIndex}
                className="bg-ctp-surface0 rounded px-2 py-1.5 text-xs"
              >
                <p className="text-[10px] font-semibold text-ctp-overlay1 uppercase tracking-wider mb-1">
                  Message {step.messageIndex + 1} · {step.message.role}
                </p>
                <p className="text-ctp-text truncate">{step.message.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ---- Helpers ----

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
      {children}
    </p>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-ctp-subtext0">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-0.5 text-ctp-text text-right focus:outline-none focus:border-ctp-accent"
      />
    </div>
  )
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-ctp-subtext0">{label}</label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-ctp-surface1 accent-ctp-accent"
      />
    </div>
  )
}
