import { useState, useEffect, useRef, useCallback } from 'react'
import type { RecursionGraph, WorkingEntry, KeywordMatchOptions } from '@/types'
import { buildGraph, incrementalUpdate, computeLayout } from '@/services/graph-service'
import { createDocumentStore, type DocumentStore } from '@/stores/document-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'

export interface DerivedState {
  graph: RecursionGraph
}

const DEFAULT_OPTIONS: KeywordMatchOptions = {
  caseSensitive: false,
  matchWholeWords: false,
}

function emptyGraph(): RecursionGraph {
  return {
    edges: new Map(),
    reverseEdges: new Map(),
    edgeMeta: new Map(),
  }
}

// Stable fallback store used when no real document store exists.
// This ensures the Zustand hook is always called unconditionally.
const EMPTY_STORE: DocumentStore = createDocumentStore({
  entries: [],
  bookMeta: {
    name: '',
    description: '',
    scanDepth: 4,
    tokenBudget: 4096,
    recursiveScan: false,
    caseSensitive: false,
    matchWholeWords: false,
    extensions: {},
  },
})

export function useDerivedState(tabId: string | null): DerivedState {
  const [graph, setGraph] = useState<RecursionGraph>(emptyGraph)
  const prevEntriesRef = useRef<WorkingEntry[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)

  const persistMissingPositions = useCallback(
    (currentEntries: WorkingEntry[], newGraph: RecursionGraph) => {
      if (!realStore) return
      const storeState = realStore.getState()
      const existing = storeState.graphPositions
      const missing = currentEntries.filter((e) => !existing.has(e.id))
      if (missing.length === 0) return
      const allPositions = computeLayout(currentEntries, newGraph, existing)

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
    },
    [realStore],
  )

  const recompute = useCallback(
    (currentEntries: WorkingEntry[], prevEntries: WorkingEntry[]) => {
      const hasStructuralChange =
        currentEntries.length !== prevEntries.length ||
        currentEntries.some((e, i) => prevEntries[i]?.id !== e.id)

      if (hasStructuralChange || prevEntries.length === 0) {
        const newGraph = buildGraph(currentEntries, DEFAULT_OPTIONS)
        setGraph(newGraph)
        persistMissingPositions(currentEntries, newGraph)
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
          changedEntry = curr
          changeType = keysChanged ? 'keys' : 'content'
        }
      }

      if (!multipleChanged && changedEntry && changeType) {
        const type = changeType
        const entry = changedEntry
        setGraph((prev) => incrementalUpdate(prev, entry, currentEntries, DEFAULT_OPTIONS, type))
      } else {
        const newGraph = buildGraph(currentEntries, DEFAULT_OPTIONS)
        setGraph(newGraph)
        persistMissingPositions(currentEntries, newGraph)
      }
    },
    [persistMissingPositions],
  )

  useEffect(() => {
    if (!tabId) {
      setGraph(emptyGraph())
      prevEntriesRef.current = []
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const prev = prevEntriesRef.current
    prevEntriesRef.current = entries

    debounceRef.current = setTimeout(() => {
      recompute(entries, prev)
    }, 150)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [entries, tabId, recompute])

  return { graph }
}
