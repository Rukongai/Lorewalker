import { useState } from 'react'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { DeepAnalysisDialog } from '@/components/analysis/DeepAnalysisDialog'
import { AnalysisFindingList } from './AnalysisFindingList'
import { AnalysisViolationList } from './AnalysisViolationList'
import { AnalysisDetailPane } from './AnalysisDetailPane'
import type { Finding, RecursionGraph } from '@/types'

interface AnalysisTabContentProps {
  tabId: string | null
  graph: RecursionGraph
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
  onNavigateToKeyword: (keyword: string) => void
}

export function AnalysisTabContent({ tabId, graph, onOpenEntry, onSelectEntry, onNavigateToKeyword }: AnalysisTabContentProps) {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [deepAnalysisOpen, setDeepAnalysisOpen] = useState(false)

  const activeLlmProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)

  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const findings = activeStore((s) => s.findings)
  const llmFindings = activeStore((s) => s.llmFindings)
  const healthScore = activeStore((s) => s.healthScore)
  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)

  const allFindings: Finding[] = [...findings, ...llmFindings]

  function handleDeepAnalysisComplete(newLlmFindings: Finding[]) {
    realStore?.getState().setLlmFindings(newLlmFindings)
  }

  if (!tabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-ctp-overlay1">Open a lorebook to see analysis</p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left nav: ~240px, fixed width */}
      <div className="w-[240px] shrink-0 border-r border-ctp-surface0 flex flex-col overflow-hidden">
        <AnalysisFindingList
          findings={allFindings}
          healthScore={healthScore}
          selectedRuleId={selectedRuleId}
          hasLlmProvider={!!activeLlmProviderId}
          onSelectRule={(ruleId) => {
            setSelectedRuleId(ruleId)
            setSelectedFinding(null)
          }}
          onDeepAnalysis={() => setDeepAnalysisOpen(true)}
        />
      </div>

      {/* Middle: violations for selected rule (~35%) */}
      <div className="w-[35%] min-w-[240px] border-r border-ctp-surface0 flex flex-col overflow-hidden">
        <AnalysisViolationList
          findings={allFindings.filter((f) => f.ruleId === selectedRuleId)}
          ruleId={selectedRuleId}
          selectedFindingId={selectedFinding?.id ?? null}
          onSelectFinding={setSelectedFinding}
        />
      </div>

      {/* Right: detail pane */}
      <div className="flex-1 overflow-hidden">
        <AnalysisDetailPane
          finding={selectedFinding}
          entries={entries}
          graph={graph}
          onOpenEntry={onOpenEntry}
          onSelectEntry={onSelectEntry}
          onNavigateToKeyword={onNavigateToKeyword}
        />
      </div>

      {deepAnalysisOpen && activeLlmProviderId && (
        <DeepAnalysisDialog
          providerId={activeLlmProviderId}
          context={{ entries, bookMeta, graph }}
          onComplete={handleDeepAnalysisComplete}
          onClose={() => setDeepAnalysisOpen(false)}
        />
      )}
    </div>
  )
}
