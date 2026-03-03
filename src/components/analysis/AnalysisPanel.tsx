import { useState } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { llmService } from '@/services/llm/llm-service'
import { categorizeAll } from '@/services/categorize-service'
import { HealthScoreCard } from '@/features/health/HealthScoreCard'
import { FindingsList } from '@/features/health/FindingsList'
import { DeepAnalysisTrigger } from '@/features/health/DeepAnalysisTrigger'
import type { Finding, RecursionGraph } from '@/types'

interface AnalysisPanelProps {
  tabId: string | null
  graph: RecursionGraph
}

function AiBadge() {
  return (
    <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-ctp-accent/20 text-ctp-accent leading-none">
      AI
    </span>
  )
}

export function AnalysisPanel({ tabId, graph }: AnalysisPanelProps) {
  const [categorizing, setCategorizing] = useState(false)
  const [categorizeProgress, setCategorizeProgress] = useState<{ done: number; total: number } | null>(null)
  const [categorizeError, setCategorizeError] = useState<string | null>(null)

  const activeLlmProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)
  const llmCategorization = useWorkspaceStore((s) => s.llmCategorization)

  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const findings = activeStore((s) => s.findings)
  const llmFindings = activeStore((s) => s.llmFindings)
  const healthScore = activeStore((s) => s.healthScore)
  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)

  const allFindings: Finding[] = [...findings, ...llmFindings]

  function handleSelectEntry(entryId: string) {
    realStore?.getState().selectEntry(entryId)
  }

  function handleDeepAnalysisComplete(newLlmFindings: Finding[]) {
    realStore?.getState().setLlmFindings(newLlmFindings)
  }

  const categorizationProviderId = llmCategorization.providerId ?? activeLlmProviderId ?? ''
  const canCategorize = llmCategorization.enabled && !!categorizationProviderId

  async function handleCategorize() {
    if (!realStore || !canCategorize) return
    setCategorizing(true)
    setCategorizeProgress(null)
    setCategorizeError(null)
    try {
      const updates = await categorizeAll(
        entries,
        llmService,
        categorizationProviderId,
        (done, total) => setCategorizeProgress({ done, total }),
        llmCategorization.skipManualOverrides
      )
      realStore.getState().setCategoryBatch(updates)
    } catch (err) {
      setCategorizeError(err instanceof Error ? err.message : String(err))
    } finally {
      setCategorizing(false)
      setCategorizeProgress(null)
    }
  }

  if (!tabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-ctp-overlay1">Open a lorebook to see analysis</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Score section */}
      <div className="p-3 border-b border-ctp-surface0 shrink-0 space-y-2">
        <HealthScoreCard
          score={healthScore.overall}
          summary={healthScore.summary}
          categories={healthScore.categories}
        />

        {/* Deep Analysis button */}
        <div className="pt-1 flex items-center justify-between">
          <DeepAnalysisTrigger
            hasLlmProvider={!!activeLlmProviderId}
            providerId={activeLlmProviderId ?? undefined}
            context={{ entries, bookMeta, graph }}
            onComplete={handleDeepAnalysisComplete}
          />
          {llmFindings.length > 0 && (
            <span className="text-[10px] text-ctp-overlay1 flex items-center gap-1">
              <AiBadge /> {llmFindings.length} AI finding{llmFindings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Categorize Entries button */}
        <div className="flex items-center justify-between gap-2">
          <Tooltip text={
            !llmCategorization.enabled
              ? 'Enable LLM categorization in Settings → LLM Tools'
              : !categorizationProviderId
              ? 'Add a provider in Settings → Providers to enable'
              : 'Categorize entries using LLM'
          }>
            <button
              onClick={handleCategorize}
              disabled={!canCategorize || categorizing}
              className="px-2 py-1 rounded text-[10px] bg-ctp-surface1 text-ctp-subtext1 font-medium disabled:opacity-40 hover:bg-ctp-surface2 transition-colors"
            >
              Categorize Entries
            </button>
          </Tooltip>
          {categorizing && categorizeProgress && (
            <span className="text-[10px] text-ctp-overlay1">
              Categorizing {categorizeProgress.done}/{categorizeProgress.total}…
            </span>
          )}
          {categorizing && !categorizeProgress && (
            <span className="text-[10px] text-ctp-overlay1">Starting…</span>
          )}
          {categorizeError && (
            <span className="text-[10px] text-ctp-red truncate" title={categorizeError}>
              Error: {categorizeError.slice(0, 40)}
            </span>
          )}
        </div>
      </div>

      {/* Findings list */}
      <div className="flex-1 overflow-hidden">
        <FindingsList
          findings={allFindings}
          onSelectEntry={handleSelectEntry}
        />
      </div>

    </div>
  )
}
