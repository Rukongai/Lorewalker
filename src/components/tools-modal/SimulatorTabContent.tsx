import { useState } from 'react'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { SimulatorConversationPane } from './SimulatorConversationPane'
import { SimulatorResultsPane } from './SimulatorResultsPane'
import type { ActivationResult } from '@/types'

interface SimulatorTabContentProps {
  tabId: string | null
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
}

export function SimulatorTabContent({ tabId, onOpenEntry, onSelectEntry }: SimulatorTabContentProps) {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)

  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)
  const simulatorState = activeStore((s) => s.simulatorState)

  // Determine which result to show in the right pane:
  // If user clicked a history step, show that; otherwise show lastResult
  const displayResult: ActivationResult | null =
    selectedStepIndex !== null
      ? (simulatorState.conversationHistory[selectedStepIndex]?.result ?? null)
      : simulatorState.lastResult

  if (!tabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-ctp-overlay1">Open a lorebook to use the simulator</p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left pane: conversation composer (~40%) */}
      <div className="w-[40%] min-w-[300px] border-r border-ctp-surface0 flex flex-col overflow-hidden">
        <SimulatorConversationPane
          tabId={tabId}
          selectedStepIndex={selectedStepIndex}
          onSelectStep={(i) => setSelectedStepIndex(i)}
          onResultReady={() => setSelectedStepIndex(null)}
        />
      </div>

      {/* Right pane: results (~60%) */}
      <div className="flex-1 overflow-hidden">
        <SimulatorResultsPane
          result={displayResult}
          entries={entries}
          onOpenEntry={onOpenEntry}
          onSelectEntry={onSelectEntry}
        />
      </div>
    </div>
  )
}
