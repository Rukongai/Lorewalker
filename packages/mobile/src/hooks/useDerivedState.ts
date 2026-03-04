import { useEffect, useRef } from 'react'
import {
  documentStoreRegistry,
  runDeterministic,
  computeHealthScore,
  defaultRubric,
  buildGraph,
} from '@lorewalker/core'

export function useDerivedState(tabId: string | null): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!tabId) return
    const store = documentStoreRegistry.get(tabId)
    if (!store) return

    async function runAnalysis() {
      try {
        const s = store!.getState()
        const graph = buildGraph(s.entries)
        const ctx = { entries: s.entries, bookMeta: s.bookMeta, graph }
        const findings = await runDeterministic(ctx, defaultRubric)
        const healthScore = computeHealthScore(findings, defaultRubric)
        store!.setState({ findings, healthScore })
      } catch (err) {
        console.warn('[useDerivedState] Analysis failed:', err)
      }
    }

    // Run immediately on mount
    void runAnalysis()

    // Subscribe to entries/bookMeta changes
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.entries !== prev.entries || state.bookMeta !== prev.bookMeta) {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => void runAnalysis(), 150)
      }
    })

    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [tabId])
}
