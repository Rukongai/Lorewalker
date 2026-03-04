import { useEffect, useRef } from 'react'
import {
  documentStoreRegistry,
  runDeterministic,
  computeHealthScore,
  defaultRubric,
} from '@lorewalker/core'
import type { RecursionGraph } from '@lorewalker/core'

// Mobile has no graph view — skip graph building (elkjs is browser-only).
// Recursion-graph-dependent rules will produce no findings; all other rules run normally.
const EMPTY_GRAPH: RecursionGraph = {
  edges: new Map(),
  reverseEdges: new Map(),
  edgeMeta: new Map(),
}

export function useDerivedState(tabId: string | null): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!tabId) return
    const store = documentStoreRegistry.get(tabId)
    if (!store) return

    function runAnalysis() {
      const s = store!.getState()
      const graph = EMPTY_GRAPH
      const ctx = { entries: s.entries, bookMeta: s.bookMeta, graph }
      const findings = runDeterministic(ctx, defaultRubric)
      const healthScore = computeHealthScore(findings, defaultRubric)
      store!.setState((prev) => ({ ...prev, findings, healthScore }))
    }

    // Run immediately on mount
    runAnalysis()

    // Subscribe to entries/bookMeta changes
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.entries !== prev.entries || state.bookMeta !== prev.bookMeta) {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(runAnalysis, 150)
      }
    })

    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [tabId])
}
