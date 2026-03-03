import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { filterRulesByFormat } from '@/services/analysis/format-filter'
import type { RecursionGraph, WorkingEntry, KeywordMatchOptions, Finding, HealthScore, Rubric } from '@/types'
import { buildGraph, incrementalUpdate, computeLayout } from '@/services/graph-service'
import { runDeterministic, computeHealthScore } from '@/services/analysis/analysis-service'
import { defaultRubric } from '@/services/analysis/default-rubric'
import { customRuleToRule } from '@/services/analysis/custom-rule-adapter'
import { createDocumentStore, type DocumentStore } from '@/stores/document-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { useWorkspaceStore } from '@/stores/workspace-store'

export interface DerivedState {
  graph: RecursionGraph
  findings: Finding[]
  healthScore: HealthScore
  activeRubric: Rubric
}

function emptyGraph(): RecursionGraph {
  return {
    edges: new Map(),
    reverseEdges: new Map(),
    edgeMeta: new Map(),
  }
}

function emptyHealthScore(): HealthScore {
  return {
    overall: 100,
    categories: {
      structure: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
      config: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
      keywords: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
      content: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
      recursion: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
      budget: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
    },
    summary: 'No file open',
  }
}

// Stable fallback store used when no real document store exists.
// This ensures the Zustand hook is always called unconditionally.
export const EMPTY_STORE: DocumentStore = createDocumentStore({
  entries: [],
  bookMeta: {
    name: '',
    description: '',
    scanDepth: 4,
    tokenBudget: 4096,
    contextSize: 200000,
    recursiveScan: false,
    caseSensitive: false,
    matchWholeWords: false,
    extensions: {},
    minActivations: 0,
    maxDepth: 0,
    maxRecursionSteps: 0,
    insertionStrategy: 'evenly',
    includeNames: false,
    useGroupScoring: false,
    alertOnOverflow: false,
    budgetCap: 0,
  },
})

export function useDerivedState(tabId: string | null): DerivedState {
  const [graph, setGraph] = useState<RecursionGraph>(emptyGraph)
  const [findings, setFindings] = useState<Finding[]>([])
  const [healthScore, setHealthScore] = useState<HealthScore>(emptyHealthScore)
  const prevEntriesRef = useRef<WorkingEntry[]>([])
  const prevBookMatchOptionsRef = useRef<KeywordMatchOptions>({ caseSensitive: false, matchWholeWords: false })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wsCustomRules = useWorkspaceStore((s) => s.customRules)
  const disabledBuiltinRuleIds = useWorkspaceStore((s) => s.disabledBuiltinRuleIds)
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)
  const ruleOverrides = activeStore((s) => s.ruleOverrides)
  const activeFormat = activeStore((s) => s.activeFormat)
  const bookMatchOptions = useMemo(
    () => ({ caseSensitive: bookMeta.caseSensitive, matchWholeWords: bookMeta.matchWholeWords }),
    [bookMeta.caseSensitive, bookMeta.matchWholeWords],
  )

  // Assemble active rubric:
  // 1. Default rules minus workspace-disabled and doc-disabled
  // 2. + workspace custom rules (enabled, not doc-disabled)
  // 3. + doc custom rules (enabled)
  const activeRubric = useMemo((): Rubric => {
    const docDisabledIds = new Set(ruleOverrides.disabledRuleIds)
    const wsDisabledIds = new Set(disabledBuiltinRuleIds)

    const filteredDefault = defaultRubric.rules.filter(
      (r) => !wsDisabledIds.has(r.id) && !docDisabledIds.has(r.id)
    )

    const filteredWsCustom = wsCustomRules
      .filter((r) => r.enabled && !docDisabledIds.has(`custom/${r.id}`))
      .map(customRuleToRule)

    const filteredDocCustom = ruleOverrides.customRules
      .filter((r) => r.enabled)
      .map(customRuleToRule)

    const allRules = [...filteredDefault, ...filteredWsCustom, ...filteredDocCustom]
    return {
      ...defaultRubric,
      rules: filterRulesByFormat(allRules, activeFormat),
    }
  }, [wsCustomRules, disabledBuiltinRuleIds, ruleOverrides, activeFormat])

  const persistMissingPositions = useCallback(
    (currentEntries: WorkingEntry[], newGraph: RecursionGraph) => {
      if (!realStore) return
      const storeState = realStore.getState()
      const existing = storeState.graphPositions
      const missing = currentEntries.filter((e) => !existing.has(e.id))
      if (missing.length === 0) return
      void computeLayout(currentEntries, newGraph, existing).then((allPositions) => {
        // Build all new positions first, then write in a single setState call
        // to avoid N separate undo steps and N re-renders.
        const newPositions = new Map(existing)
        for (const entry of missing) {
          const pos = allPositions.get(entry.id)
          if (pos) newPositions.set(entry.id, pos)
        }
        if (newPositions.size !== existing.size) {
          // Use setState directly to bypass temporal (zundo) tracking —
          // auto-layout position writes should not create undo steps.
          realStore.setState((s) => ({ ...s, graphPositions: newPositions }))
        }
      }).catch((err) => console.error('[useDerivedState] ELK layout failed:', err))
    },
    [realStore],
  )

  const runAnalysis = useCallback(
    async (currentEntries: WorkingEntry[], newGraph: RecursionGraph) => {
      try {
        const newFindings = await runDeterministic(
          { entries: currentEntries, bookMeta, graph: newGraph },
          activeRubric,
        )
        const newHealthScore = computeHealthScore(newFindings, activeRubric)
        if (realStore) {
          realStore.setState((s) => ({ ...s, findings: newFindings, healthScore: newHealthScore }))
        }
        setFindings(newFindings)
        setHealthScore(newHealthScore)
      } catch (err) {
        console.error('[useDerivedState] Analysis failed:', err)
      }
    },
    [realStore, bookMeta, activeRubric],
  )

  const recompute = useCallback(
    (currentEntries: WorkingEntry[], prevEntries: WorkingEntry[], opts: KeywordMatchOptions, prevOpts: KeywordMatchOptions) => {
      const hasStructuralChange =
        currentEntries.length !== prevEntries.length ||
        currentEntries.some((e, i) => prevEntries[i]?.id !== e.id)

      const optionsChanged =
        opts.caseSensitive !== prevOpts.caseSensitive ||
        opts.matchWholeWords !== prevOpts.matchWholeWords

      if (hasStructuralChange || prevEntries.length === 0 || optionsChanged) {
        const newGraph = buildGraph(currentEntries, opts)
        setGraph(newGraph)
        persistMissingPositions(currentEntries, newGraph)
        void runAnalysis(currentEntries, newGraph)
        return
      }

      // Detect single-entry change for incremental update
      let changedEntry: WorkingEntry | null = null
      let changeType: 'content' | 'keys' | null = null
      let multipleChanged = false

      for (let i = 0; i < currentEntries.length; i++) {
        const curr = currentEntries[i]
        const prev = prevEntries[i]
        const contentChanged = curr.content !== prev.content
        const keysChanged = curr.keys !== prev.keys
        if (contentChanged || keysChanged) {
          if (changedEntry !== null) { multipleChanged = true; break }
          if (contentChanged && keysChanged) { multipleChanged = true; break }
          changedEntry = curr
          changeType = keysChanged ? 'keys' : 'content'
        }
      }

      if (!multipleChanged && changedEntry && changeType) {
        const type = changeType
        const entry = changedEntry
        setGraph((prev) => {
          const newGraph = incrementalUpdate(prev, entry, currentEntries, opts, type)
          void runAnalysis(currentEntries, newGraph)
          return newGraph
        })
      } else {
        const newGraph = buildGraph(currentEntries, opts)
        setGraph(newGraph)
        persistMissingPositions(currentEntries, newGraph)
        void runAnalysis(currentEntries, newGraph)
      }
    },
    [persistMissingPositions, runAnalysis],
  )

  useEffect(() => {
    if (!tabId) {
      setGraph(emptyGraph())
      setFindings([])
      setHealthScore(emptyHealthScore())
      prevEntriesRef.current = []
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const prev = prevEntriesRef.current
    const prevOpts = prevBookMatchOptionsRef.current
    prevEntriesRef.current = entries
    prevBookMatchOptionsRef.current = bookMatchOptions

    debounceRef.current = setTimeout(() => {
      recompute(entries, prev, bookMatchOptions, prevOpts)
    }, 150)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [entries, bookMatchOptions, tabId, recompute])

  return { graph, findings, healthScore, activeRubric }
}
