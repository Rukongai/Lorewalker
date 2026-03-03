import { useState } from 'react'
import { Play, PlusCircle, RotateCcw } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import type { WorkingEntry, RecursionGraph, BookMeta, SimMessage, ActivationResult, ConversationStep } from '@/types'
import { KeywordReachTable, LorebookKeywordReachTable } from '@/features/keywords/KeywordReachTable'
import { MessageComposer } from '@/features/simulator/MessageComposer'
import { ActivationResultList } from '@/features/simulator/ActivationResultList'
import { EntrySimulation } from './EntrySimulation'

// --- Lorebook scope Simulator pane (inline) ---

interface LorebookSimulatorPaneProps {
  messages: SimMessage[]
  lastResult: ActivationResult | null
  conversationHistory: ConversationStep[]
  selectedStepIndex: number | null
  onRun: () => void
  onSetMessages: (messages: SimMessage[]) => void
  onAddToConversation: () => void
  onClearSimulation: () => void
  onClearHistory: () => void
  onSelectStep: (i: number | null) => void
}

function LorebookSimulatorPane({
  messages,
  lastResult,
  conversationHistory,
  selectedStepIndex,
  onRun,
  onSetMessages,
  onAddToConversation,
  onClearSimulation,
  onClearHistory,
  onSelectStep,
}: LorebookSimulatorPaneProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-ctp-surface0 shrink-0 flex items-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          Engine: SillyTavern
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">Messages</p>
        <MessageComposer messages={messages} onChange={onSetMessages} />
      </div>

      <div className="px-3 py-2 border-t border-ctp-surface0 shrink-0 flex flex-col gap-2">
        <button
          onClick={onRun}
          disabled={messages.length === 0}
          className="flex items-center justify-center gap-1.5 py-1.5 text-xs bg-ctp-accent text-ctp-base rounded font-medium disabled:opacity-40 hover:opacity-90 transition-opacity w-full"
        >
          <Play size={11} />
          Run Simulation
        </button>

        {lastResult !== null && (
          <div className="flex gap-2">
            <Tooltip text="Clear result">
              <button
                onClick={onClearSimulation}
                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-ctp-overlay1 hover:text-ctp-text border border-ctp-surface1 hover:border-ctp-surface2 rounded transition-colors"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            </Tooltip>
            <Tooltip text="Append this result to conversation history">
              <button
                onClick={onAddToConversation}
                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-ctp-overlay1 hover:text-ctp-text border border-ctp-surface1 hover:border-ctp-surface2 rounded transition-colors"
              >
                <PlusCircle size={10} />
                Add to Conversation
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {conversationHistory.length > 0 && (
        <div className="border-t border-ctp-surface0 shrink-0 max-h-[35%] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-ctp-surface0 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
              History ({conversationHistory.length})
            </p>
            <button
              onClick={() => { onClearHistory(); onSelectStep(null) }}
              className="text-[10px] text-ctp-overlay1 hover:text-ctp-red transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="overflow-y-auto">
            {conversationHistory.map((step, i) => (
              <button
                key={i}
                onClick={() => onSelectStep(selectedStepIndex === i ? null : i)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left border-b border-ctp-surface0 last:border-b-0 transition-colors text-xs ${
                  selectedStepIndex === i
                    ? 'bg-ctp-surface1 text-ctp-text'
                    : 'text-ctp-subtext1 hover:bg-ctp-surface0'
                }`}
              >
                <span className="text-[10px] text-ctp-overlay1 shrink-0 tabular-nums w-4">#{i + 1}</span>
                <span className={`text-[10px] font-semibold shrink-0 ${
                  step.message.role === 'user' ? 'text-ctp-blue' :
                  step.message.role === 'assistant' ? 'text-ctp-green' : 'text-ctp-yellow'
                }`}>{step.message.role}</span>
                <span className="truncate text-[10px] text-ctp-subtext0">{step.message.content}</span>
                <span className="text-[10px] text-ctp-overlay1 shrink-0 tabular-nums">
                  {step.result.activatedEntries.length}↑
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Entry scope props ---

export interface InsightsViewEntryProps {
  scope: 'entry'
  entryId: string
  entry: WorkingEntry
  graph: RecursionGraph
  entries: WorkingEntry[]
  bookMeta: BookMeta
  onOpenEntry?: (id: string) => void
}

// --- Lorebook scope props ---

export interface InsightsViewLorebookProps {
  scope: 'lorebook'
  entries: WorkingEntry[]
  graph: RecursionGraph
  bookMeta: BookMeta
  messages: SimMessage[]
  lastResult: ActivationResult | null
  conversationHistory: ConversationStep[]
  selectedStepIndex: number | null
  onRun: () => void
  onSetMessages: (messages: SimMessage[]) => void
  onAddToConversation: () => void
  onClearSimulation: () => void
  onClearHistory: () => void
  onSelectStep: (i: number | null) => void
  onCategorizeAll?: (onProgress: (done: number, total: number) => void) => Promise<void>
  onOpenEntry?: (id: string) => void
  onSelectEntry?: (id: string) => void
}

export type InsightsViewProps = InsightsViewEntryProps | InsightsViewLorebookProps

export function InsightsView(props: InsightsViewProps) {
  const [catState, setCatState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [catError, setCatError] = useState<string | null>(null)
  const [catProgress, setCatProgress] = useState<{ done: number; total: number } | null>(null)

  if (props.scope === 'lorebook') {
    const {
      entries, graph, messages, lastResult, conversationHistory, selectedStepIndex,
      onRun, onSetMessages, onAddToConversation, onClearSimulation, onClearHistory,
      onSelectStep, onCategorizeAll, onOpenEntry, onSelectEntry,
    } = props

    const displayResult =
      selectedStepIndex !== null
        ? conversationHistory[selectedStepIndex]?.result ?? null
        : lastResult

    async function handleCategorizeAll() {
      if (!onCategorizeAll || catState === 'loading') return
      setCatState('loading')
      setCatError(null)
      setCatProgress(null)
      try {
        await onCategorizeAll((done, total) => setCatProgress({ done, total }))
        setCatState('idle')
        setCatProgress(null)
      } catch (err) {
        setCatState('error')
        setCatError(err instanceof Error ? err.message : String(err))
      }
    }

    const uncategorizedCount = entries.filter((e) => !e.userCategory).length

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top pane — full-width AI insights placeholder */}
        <div className="h-[80px] shrink-0 border-b border-ctp-surface0 flex items-center justify-center">
          <p className="text-xs text-ctp-overlay1">LLM insights coming soon</p>
        </div>

        {/* Bottom row — split: left categorize + simulator, right keyword reach */}
        <div className="flex-1 min-h-0 flex flex-row">
          {/* Bottom-left: Categorize All + Lorebook Simulator */}
          <div className="w-[40%] min-w-[280px] border-r border-ctp-surface0 flex flex-col overflow-hidden">
            {/* Categorize All section */}
            <div className="px-3 py-2 border-b border-ctp-surface0 shrink-0 flex items-center gap-3">
              {catState === 'idle' && (
                <>
                  <Tooltip text={onCategorizeAll ? 'Auto-categorize all entries with LLM' : 'No LLM provider configured'}>
                    <button
                      onClick={handleCategorizeAll}
                      disabled={!onCategorizeAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-ctp-accent text-ctp-base font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      ✦ Categorize All
                    </button>
                  </Tooltip>
                  {uncategorizedCount > 0 && (
                    <span className="text-[10px] text-ctp-overlay1">{uncategorizedCount} uncategorized</span>
                  )}
                </>
              )}
              {catState === 'loading' && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-ctp-accent border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-xs text-ctp-subtext0">
                    {catProgress ? `Categorizing… ${catProgress.done}/${catProgress.total}` : 'Categorizing…'}
                  </span>
                </div>
              )}
              {catState === 'error' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ctp-red truncate max-w-[200px]">{catError ?? 'Failed'}</span>
                  <button
                    onClick={() => { setCatState('idle'); setCatError(null) }}
                    className="text-[10px] text-ctp-overlay1 hover:text-ctp-subtext1 transition-colors shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
            <LorebookSimulatorPane
              messages={messages}
              lastResult={lastResult}
              conversationHistory={conversationHistory}
              selectedStepIndex={selectedStepIndex}
              onRun={onRun}
              onSetMessages={onSetMessages}
              onAddToConversation={onAddToConversation}
              onClearSimulation={onClearSimulation}
              onClearHistory={onClearHistory}
              onSelectStep={onSelectStep}
            />
          </div>

          {/* Bottom-right: Keyword reach (results for selected step, or nothing) */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {displayResult !== null ? (
              <ActivationResultList
                result={displayResult}
                entries={entries}
                onSelectEntry={onSelectEntry ?? (() => undefined)}
                onOpenEntry={onOpenEntry}
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
                  Keyword Reach
                </p>
                <LorebookKeywordReachTable graph={graph} entries={entries} />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Entry scope
  const { entryId, entry, graph, entries, bookMeta, onOpenEntry } = props
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top pane — placeholder for future LLM insights */}
      <div className="flex-[2] min-h-0 border-b border-ctp-surface0 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">LLM insights coming soon</p>
      </div>

      {/* Bottom row — split 50/50 */}
      <div className="flex-[3] min-h-0 flex flex-row">
        {/* Bottom-left: Entry Simulation */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 border-r border-ctp-surface0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
            Entry Simulation
          </p>
          <EntrySimulation entry={entry} entries={entries} bookMeta={bookMeta} onOpenEntry={onOpenEntry} />
        </div>

        {/* Bottom-right: Keyword Reach */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
            Keyword Reach
          </p>
          <KeywordReachTable entryId={entryId} graph={graph} entries={entries} />
        </div>
      </div>
    </div>
  )
}
