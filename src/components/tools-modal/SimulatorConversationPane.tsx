import { useState } from 'react'
import { Play, PlusCircle, Trash2, RotateCcw } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { simulate, simulateConversation } from '@/services/simulator-service'
import type { SimMessage, SimulationContext, SimulationSettings } from '@/types'
import { MessageInput } from '@/components/simulator/MessageInput'

interface SimulatorConversationPaneProps {
  tabId: string | null
  selectedStepIndex: number | null
  onSelectStep: (index: number) => void
  onResultReady: () => void
}

export function SimulatorConversationPane({
  tabId,
  selectedStepIndex,
  onSelectStep,
  onResultReady,
}: SimulatorConversationPaneProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const simulatorState = activeStore((s) => s.simulatorState)
  const [localMessages, setLocalMessages] = useState<SimMessage[]>(() => simulatorState.messages)

  function handleRun() {
    if (!realStore) return
    const state = realStore.getState()
    const context: SimulationContext = {
      messages: localMessages,
      scanDepth: state.bookMeta.scanDepth,
      tokenBudget: state.bookMeta.tokenBudget,
      caseSensitive: state.bookMeta.caseSensitive,
      matchWholeWords: state.bookMeta.matchWholeWords,
      maxRecursionSteps: state.bookMeta.maxRecursionSteps,
      includeNames: state.bookMeta.includeNames,
    }
    state.setSimulatorMessages(localMessages)
    const result = simulate(state.entries, context)
    state.setSimulatorResult(result)
    onResultReady()
  }

  function handleAddToConversation() {
    if (!realStore) return
    const state = realStore.getState()
    if (!state.simulatorState.lastResult) return
    const settings: SimulationSettings = {
      defaultScanDepth: state.bookMeta.scanDepth,
      defaultTokenBudget: state.bookMeta.tokenBudget,
      defaultCaseSensitive: state.bookMeta.caseSensitive,
      defaultMatchWholeWords: state.bookMeta.matchWholeWords,
      defaultMaxRecursionSteps: state.bookMeta.maxRecursionSteps,
      defaultIncludeNames: state.bookMeta.includeNames,
    }
    const steps = simulateConversation(state.entries, localMessages, settings)
    for (const step of steps) {
      state.appendConversationStep(step)
    }
  }

  function handleClearHistory() {
    realStore?.getState().clearConversationHistory()
  }

  function handleClearSimulation() {
    realStore?.getState().clearSimulation()
  }

  const { lastResult, conversationHistory } = simulatorState

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Engine badge */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <span className="text-[9px] font-semibold uppercase tracking-wider bg-ctp-surface1 text-ctp-subtext0 rounded px-1.5 py-px">
          Engine: SillyTavern
        </span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">
        {/* Message composer */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">Messages</p>
          <MessageInput messages={localMessages} onChange={setLocalMessages} />
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={localMessages.length === 0}
          className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-ctp-accent text-ctp-base rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <Play size={13} />
          Run
        </button>

        {/* Reset button (when result exists) */}
        {lastResult && (
          <button
            onClick={handleClearSimulation}
            className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border border-ctp-surface1 text-ctp-subtext0 hover:text-ctp-red hover:border-ctp-red rounded transition-colors"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}

        {/* Add to conversation button */}
        {lastResult && (
          <button
            onClick={handleAddToConversation}
            className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border border-ctp-surface1 text-ctp-subtext0 hover:text-ctp-text hover:border-ctp-surface2 rounded transition-colors"
          >
            <PlusCircle size={11} />
            Add to Conversation
          </button>
        )}

        {/* Conversation history */}
        {conversationHistory.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
                History ({conversationHistory.length} steps)
              </p>
              <Tooltip text="Clear history">
                <button
                  onClick={handleClearHistory}
                  className="p-0.5 rounded text-ctp-overlay1 hover:text-ctp-red transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </Tooltip>
            </div>
            <div className="flex flex-col gap-1.5">
              {conversationHistory.map((step, i) => (
                <button
                  key={i}
                  onClick={() => onSelectStep(i)}
                  className={`w-full text-left rounded p-2.5 border transition-colors ${
                    selectedStepIndex === i
                      ? 'border-ctp-accent bg-ctp-surface1'
                      : 'border-ctp-surface1 bg-ctp-surface0 hover:border-ctp-surface2 hover:bg-ctp-surface1'
                  }`}
                >
                  <p className="text-[10px] text-ctp-subtext0 mb-0.5">
                    <span className="font-semibold capitalize">[{step.message.role}]</span>{' '}
                    {step.message.content.slice(0, 60)}{step.message.content.length > 60 ? '…' : ''}
                  </p>
                  <p className="text-[9px] text-ctp-overlay1">
                    {step.result.activatedEntries.length} activated · {step.result.totalTokens}t
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
