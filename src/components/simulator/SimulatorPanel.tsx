import { useState, useMemo } from 'react'
import { Play, PlusCircle, Trash2, Network, RotateCcw } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { simulate, simulateConversation } from '@/services/simulator-service'
import { buildKeywordInventory } from '@/services/keyword-analysis-service'
import type { SimMessage, SimulationContext, SimulationSettings, ActivatedEntry, WorkingEntry } from '@/types'
import { MessageInput } from './MessageInput'
import { ActivationResults } from './ActivationResults'

interface SimulatorPanelProps {
  tabId: string | null
}

type ResultsTab = 'activation' | 'breakdown'

function entryName(entries: WorkingEntry[], id: string): string {
  return entries.find((e) => e.id === id)?.name ?? id
}

export function SimulatorPanel({ tabId }: SimulatorPanelProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const simulatorState = activeStore((s) => s.simulatorState)

  // Local message composition state (pushed to store on run)
  const [localMessages, setLocalMessages] = useState<SimMessage[]>(() => simulatorState.messages)
  const [resultsTab, setResultsTab] = useState<ResultsTab>('activation')
  const [selectedKeyword, setSelectedKeyword] = useState<string>('')

  const keywordStats = useMemo(() => buildKeywordInventory(entries), [entries])

  if (!tabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Open a lorebook to use the simulator</p>
      </div>
    )
  }

  function runWithMessages(messages: SimMessage[]) {
    if (!realStore) return
    const state = realStore.getState()
    const context: SimulationContext = {
      messages,
      scanDepth: state.bookMeta.scanDepth,
      tokenBudget: state.bookMeta.tokenBudget,
      caseSensitive: state.bookMeta.caseSensitive,
      matchWholeWords: state.bookMeta.matchWholeWords,
      maxRecursionSteps: state.bookMeta.maxRecursionSteps,
      includeNames: state.bookMeta.includeNames,
    }
    state.setSimulatorMessages(messages)
    const result = simulate(state.entries, context)
    state.setSimulatorResult(result)
  }

  function handleRun() {
    runWithMessages(localMessages)
  }

  function handleKeywordSelect(keyword: string) {
    if (!keyword) return
    setSelectedKeyword('')
    const messages: SimMessage[] = [{ role: 'user', content: keyword }]
    setLocalMessages(messages)
    runWithMessages(messages)
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

  function handleToggleConnectionsMode() {
    if (!realStore) return
    const state = realStore.getState()
    state.setConnectionsMode(!state.simulatorState.connectionsMode)
  }

  function handleSelectEntry(entryId: string) {
    realStore?.getState().selectEntry(entryId)
  }

  const { lastResult, conversationHistory, connectionsMode } = simulatorState

  // Keyword breakdown: group activated entries by matched keyword
  function renderBreakdown() {
    if (!lastResult) return null

    const byKeyword = new Map<string, ActivatedEntry[]>()
    const constants: ActivatedEntry[] = []
    const recursion: ActivatedEntry[] = []

    for (const ae of lastResult.activatedEntries) {
      if (ae.activatedBy === 'constant') {
        constants.push(ae)
      } else if (ae.activatedBy === 'recursion') {
        recursion.push(ae)
      } else {
        // keyword-triggered
        const kws = ae.matchedKeywords.length > 0 ? ae.matchedKeywords : ['(unknown)']
        for (const kw of kws) {
          const group = byKeyword.get(kw) ?? []
          group.push(ae)
          byKeyword.set(kw, group)
        }
      }
    }

    const sections: Array<{ label: string; entries: ActivatedEntry[] }> = []
    if (constants.length > 0) sections.push({ label: 'Constants', entries: constants })
    for (const [kw, aes] of byKeyword) {
      sections.push({ label: kw, entries: aes })
    }
    if (recursion.length > 0) sections.push({ label: 'Recursion', entries: recursion })

    if (sections.length === 0) {
      return (
        <p className="px-3 py-3 text-xs text-ctp-overlay0 text-center">No entries activated</p>
      )
    }

    return (
      <div className="flex flex-col gap-2 pb-3">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-ctp-overlay1 font-mono">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5 px-3">
              {section.entries.map((ae) => (
                <button
                  key={ae.entryId}
                  onClick={() => handleSelectEntry(ae.entryId)}
                  className="text-left text-xs text-ctp-text hover:bg-ctp-surface0 rounded px-1 py-0.5 transition-colors truncate"
                >
                  {entryName(entries, ae.entryId)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Engine badge */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <span className="text-[9px] font-semibold uppercase tracking-wider bg-ctp-surface1 text-ctp-subtext0 rounded px-1.5 py-px">
          Engine: SillyTavern
        </span>
      </div>

      {/* Message composer */}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1 min-h-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">Messages</p>
        <MessageInput messages={localMessages} onChange={setLocalMessages} />

        {/* Simulate keyword quick-fire */}
        {keywordStats.length > 0 && (
          <select
            value={selectedKeyword}
            onChange={(e) => handleKeywordSelect(e.target.value)}
            className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1.5 text-xs text-ctp-text focus:outline-none focus:border-ctp-accent"
          >
            <option value="">Simulate keyword…</option>
            <optgroup label="Primary keys">
              {keywordStats
                .filter((s) => !s.isSecondary)
                .map((s, i) => (
                  <option key={`pri-${i}`} value={s.keyword}>
                    {s.keyword}
                  </option>
                ))}
            </optgroup>
            {keywordStats.some((s) => s.isSecondary) && (
              <optgroup label="Secondary keys">
                {keywordStats
                  .filter((s) => s.isSecondary)
                  .map((s, i) => (
                    <option key={`sec-${i}`} value={s.keyword}>
                      {s.keyword}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        )}

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={localMessages.length === 0}
          className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-ctp-accent text-ctp-base rounded hover:bg-ctp-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={11} />
          Run
        </button>

        {/* Connections + Reset buttons */}
        {lastResult && (
          <div className="flex gap-2">
            <Tooltip text="Show connections between activated entries">
              <button
                onClick={handleToggleConnectionsMode}
                className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded border transition-colors ${
                  connectionsMode
                    ? 'bg-ctp-accent text-ctp-base border-ctp-accent'
                    : 'border-ctp-surface1 text-ctp-subtext0 hover:text-ctp-text hover:border-ctp-surface2'
                }`}
              >
                <Network size={11} />
                Connections
              </button>
            </Tooltip>
            <Tooltip text="Clear simulation results">
              <button
                onClick={handleClearSimulation}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-ctp-surface1 text-ctp-subtext0 hover:text-ctp-red hover:border-ctp-red rounded transition-colors"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            </Tooltip>
          </div>
        )}

        {/* Results */}
        {lastResult && (
          <div className="bg-ctp-surface0 rounded">
            {/* Results tab bar */}
            <div className="flex items-center gap-1 px-3 pt-2 pb-1">
              {(['activation', 'breakdown'] as ResultsTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setResultsTab(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    resultsTab === t
                      ? 'bg-ctp-surface2 text-ctp-text'
                      : 'text-ctp-overlay1 hover:text-ctp-subtext0'
                  }`}
                >
                  {t === 'activation' ? 'Activation' : 'Keyword Breakdown'}
                </button>
              ))}
            </div>

            {resultsTab === 'activation' && (
              <ActivationResults
                result={lastResult}
                entries={entries}
                onSelectEntry={handleSelectEntry}
              />
            )}
            {resultsTab === 'breakdown' && renderBreakdown()}
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
              <Tooltip text="Clear history">
                <button
                  onClick={handleClearHistory}
                  className="p-0.5 rounded text-ctp-overlay1 hover:text-ctp-red transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </Tooltip>
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
