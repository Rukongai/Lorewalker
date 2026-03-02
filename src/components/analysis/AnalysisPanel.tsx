import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { llmService } from '@/services/llm/llm-service'
import { categorizeAll } from '@/services/categorize-service'
import { FindingItem } from './FindingItem'
import { DeepAnalysisDialog } from './DeepAnalysisDialog'
import type { Finding, FindingSeverity, RuleCategory, RecursionGraph } from '@/types'

interface AnalysisPanelProps {
  tabId: string | null
  graph: RecursionGraph
}

type Filter = FindingSeverity | 'all'

function scoreColor(score: number): string {
  if (score < 60) return 'text-ctp-red'
  if (score < 80) return 'text-ctp-yellow'
  return 'text-ctp-green'
}

function scoreBarColor(score: number): string {
  if (score < 60) return 'bg-ctp-red'
  if (score < 80) return 'bg-ctp-yellow'
  return 'bg-ctp-green'
}

const CATEGORIES: RuleCategory[] = ['structure', 'config', 'keywords', 'recursion', 'budget', 'content']

const SEVERITY_ORDER: Record<FindingSeverity, number> = { error: 0, warning: 1, suggestion: 2 }

function AiBadge() {
  return (
    <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-ctp-accent/20 text-ctp-accent leading-none">
      AI
    </span>
  )
}

const LLM_RULE_IDS = new Set([
  'content/quality-assessment',
  'content/structure-check',
  'content/scope-check',
  'keywords/missing-variations',
])

export function AnalysisPanel({ tabId, graph }: AnalysisPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsedCats, setCollapsedCats] = useState<Set<RuleCategory>>(new Set())
  const [deepAnalysisOpen, setDeepAnalysisOpen] = useState(false)
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

  const allFindings: Finding[] = [...findings, ...llmFindings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  const errorCount = allFindings.filter((f) => f.severity === 'error').length
  const warningCount = allFindings.filter((f) => f.severity === 'warning').length
  const suggestionCount = allFindings.filter((f) => f.severity === 'suggestion').length

  const filtered = filter === 'all' ? allFindings : allFindings.filter((f) => f.severity === filter)

  const byCategory = new Map<RuleCategory, Finding[]>()
  for (const finding of filtered) {
    const cat = finding.category
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(finding)
  }

  function handleSelectEntry(entryId: string) {
    realStore?.getState().selectEntry(entryId)
  }

  function handleDeepAnalysisComplete(newLlmFindings: Finding[]) {
    realStore?.getState().setLlmFindings(newLlmFindings)
  }

  function toggleCategory(cat: RuleCategory) {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
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
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold tabular-nums ${scoreColor(healthScore.overall)}`}>
            {healthScore.overall}
          </span>
          <span className="text-xs text-ctp-overlay1 flex-1">{healthScore.summary}</span>
        </div>

        {/* Per-category bars */}
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const catScore = healthScore.categories[cat]
            return (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-[10px] text-ctp-overlay1 w-16 shrink-0 capitalize">{cat}</span>
                <div className="flex-1 h-1 rounded bg-ctp-surface1 overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${scoreBarColor(catScore.score)}`}
                    style={{ width: `${catScore.score}%` }}
                  />
                </div>
                <span className="text-[10px] text-ctp-overlay1 w-6 text-right tabular-nums">{catScore.score}</span>
              </div>
            )
          })}
        </div>

        {/* Deep Analysis button */}
        <div className="pt-1 flex items-center justify-between">
          <Tooltip text={activeLlmProviderId ? 'Run AI-powered analysis' : 'Add a provider in Settings → Providers to enable'}>
            <button
              onClick={() => setDeepAnalysisOpen(true)}
              disabled={!activeLlmProviderId}
              className="px-2 py-1 rounded text-[10px] bg-ctp-accent text-ctp-base font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Deep Analysis
            </button>
          </Tooltip>
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

      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-ctp-surface0 shrink-0">
        {(['all', 'error', 'warning', 'suggestion'] as Filter[]).map((f) => {
          const count = f === 'all' ? allFindings.length : f === 'error' ? errorCount : f === 'warning' ? warningCount : suggestionCount
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                active ? 'bg-ctp-accent text-ctp-base' : 'text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0'
              }`}
            >
              {f === 'all' ? `All ${count}` : f === 'error' ? `Error ${count}` : f === 'warning' ? `Warn ${count}` : `Hint ${count}`}
            </button>
          )
        })}
      </div>

      {/* Finding list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-ctp-overlay1">
              {allFindings.length === 0 ? 'No issues detected' : 'No findings match filter'}
            </p>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const catFindings = byCategory.get(cat)
            if (!catFindings || catFindings.length === 0) return null
            const collapsed = collapsedCats.has(cat)
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 bg-ctp-surface0 border-b border-ctp-surface1 text-left hover:bg-ctp-surface1 transition-colors"
                >
                  {collapsed
                    ? <ChevronRight size={10} className="text-ctp-overlay1 shrink-0" />
                    : <ChevronDown size={10} className="text-ctp-overlay1 shrink-0" />
                  }
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-subtext0 capitalize">
                    {cat}
                  </span>
                  <span className="ml-auto text-[10px] text-ctp-overlay1">{catFindings.length}</span>
                </button>
                {!collapsed && catFindings.map((finding) => (
                  <div key={finding.id} className="relative">
                    {LLM_RULE_IDS.has(finding.ruleId) && (
                      <span className="absolute top-2 right-2 z-10">
                        <AiBadge />
                      </span>
                    )}
                    <FindingItem
                      finding={finding}
                      onSelectEntry={handleSelectEntry}
                    />
                  </div>
                ))}
              </div>
            )
          })
        )}
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
