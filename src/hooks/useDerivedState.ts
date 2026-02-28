import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { RecursionGraph, WorkingEntry, KeywordMatchOptions } from '@/types'
import { buildGraph, incrementalUpdate, computeLayout } from '@/services/graph-service'
import { createDocumentStore, type DocumentStore } from '@/stores/document-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { useWorkspaceStore } from '@/stores/workspace-store'

export interface DerivedState {
  graph: RecursionGraph
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
export const EMPTY_STORE: DocumentStore = createDocumentStore({
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
  const prevBookMatchOptionsRef = useRef<KeywordMatchOptions>({ caseSensitive: false, matchWholeWords: false })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const graphSettings = useWorkspaceStore((s) => s.graphSettings)
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)
  const bookCaseSensitive = activeStore((s) => s.bookMeta.caseSensitive)
  const bookMatchWholeWords = activeStore((s) => s.bookMeta.matchWholeWords)
  const bookMatchOptions = useMemo(
    () => ({ caseSensitive: bookCaseSensitive, matchWholeWords: bookMatchWholeWords }),
    [bookCaseSensitive, bookMatchWholeWords],
  )

  const persistMissingPositions = useCallback(
    (currentEntries: WorkingEntry[], newGraph: RecursionGraph) => {
      if (!realStore) return
      const storeState = realStore.getState()
      const existing = storeState.graphPositions
      const missing = currentEntries.filter((e) => !existing.has(e.id))
      if (missing.length === 0) return
      const allPositions = computeLayout(currentEntries, newGraph, existing, graphSettings)

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
    [realStore, graphSettings],
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
        setGraph((prev) => incrementalUpdate(prev, entry, currentEntries, opts, type))
      } else {
        const newGraph = buildGraph(currentEntries, opts)
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

  return { graph }
}
