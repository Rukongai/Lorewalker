import { useState } from 'react'
import { Play, PlusCircle, Trash2 } from 'lucide-react'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { simulate, simulateConversation } from '@/services/simulator-service'
import type { SimMessage, SimulationContext, SimulationSettings } from '@/types'
import { MessageInput } from './MessageInput'
import { SimulatorSettings } from './SimulatorSettings'
import { ActivationResults } from './ActivationResults'

interface SimulatorPanelProps {
  tabId: string | null
}

export function SimulatorPanel({ tabId }: SimulatorPanelProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const simulatorState = activeStore((s) => s.simulatorState)

  // Local message composition state (pushed to store on run)
  const [localMessages, setLocalMessages] = useState<SimMessage[]>(() => simulatorState.messages)

  if (!tabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Open a lorebook to use the simulator</p>
      </div>
    )
  }

  function handleUpdateSettings(patch: Partial<SimulationSettings>) {
    realStore?.getState().updateSimulatorSettings(patch)
  }

  function handleRun() {
    if (!realStore) return
    const state = realStore.getState()
    const context: SimulationContext = {
      messages: localMessages,
      scanDepth: state.simulatorState.settings.defaultScanDepth,
      tokenBudget: state.simulatorState.settings.defaultTokenBudget,
      caseSensitive: state.simulatorState.settings.defaultCaseSensitive,
      matchWholeWords: state.simulatorState.settings.defaultMatchWholeWords,
      maxRecursionSteps: state.simulatorState.settings.defaultMaxRecursionSteps,
      includeNames: state.simulatorState.settings.defaultIncludeNames,
    }
    state.setSimulatorMessages(localMessages)
    const result = simulate(state.entries, context)
    state.setSimulatorResult(result)
  }

  function handleAddToConversation() {
    if (!realStore) return
    const state = realStore.getState()
    if (!state.simulatorState.lastResult) return

    const steps = simulateConversation(
      state.entries,
      localMessages,
      state.simulatorState.settings,
    )
    for (const step of steps) {
      state.appendConversationStep(step)
    }
  }

  function handleClearHistory() {
    realStore?.getState().clearConversationHistory()
  }

  function handleSelectEntry(entryId: string) {
    realStore?.getState().selectEntry(entryId)
  }

  const { lastResult, settings, conversationHistory } = simulatorState

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Engine badge */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <span className="text-[9px] font-semibold uppercase tracking-wider bg-ctp-surface1 text-ctp-subtext0 rounded px-1.5 py-px">
          Engine: SillyTavern
        </span>
      </div>

      {/* Settings accordion */}
      <SimulatorSettings settings={settings} onChange={handleUpdateSettings} />

      {/* Message composer */}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">Messages</p>
        <MessageInput messages={localMessages} onChange={setLocalMessages} />

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={localMessages.length === 0}
          className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-ctp-accent text-ctp-base rounded hover:bg-ctp-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={11} />
          Run
        </button>

        {/* Results */}
        {lastResult && (
          <div className="bg-ctp-surface0 rounded overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 px-3 pt-2 pb-1">Results</p>
            <ActivationResults
              result={lastResult}
              entries={entries}
              onSelectEntry={handleSelectEntry}
            />
          </div>
        )}

        {/* Conversation controls */}
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
                Conversation ({conversationHistory.length} steps)
              </p>
              <button
                onClick={handleClearHistory}
                className="p-0.5 rounded text-ctp-overlay1 hover:text-ctp-red transition-colors"
                title="Clear history"
              >
                <Trash2 size={10} />
              </button>
            </div>
            {conversationHistory.map((step, i) => (
              <div key={i} className="bg-ctp-surface0 rounded p-2">
                <p className="text-[9px] text-ctp-subtext0 mb-1">
                  <span className="font-semibold">[{step.message.role}]</span>{' '}
                  {step.message.content.slice(0, 60)}{step.message.content.length > 60 ? '…' : ''}
                </p>
                <p className="text-[9px] text-ctp-overlay1">
                  {step.result.activatedEntries.length} activated · {step.result.totalTokens}t
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
