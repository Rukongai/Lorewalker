import { useState, useEffect, useRef } from 'react'
import { EMPTY_STORE } from './useDerivedState'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { saveDocument } from '@/services/persistence-service'
import type { PersistedDocument } from '@/types'

const AUTOSAVE_DELAY_MS = 2000

export function useAutosave(tabId: string | null): { isSaving: boolean } {
  const [isSaving, setIsSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always call store hooks unconditionally (Rules of Hooks).
  // EMPTY_STORE is a stable fallback used when no document is open.
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE

  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)
  const graphPositions = activeStore((s) => s.graphPositions)
  const simulatorState = activeStore((s) => s.simulatorState)
  const ruleOverrides = activeStore((s) => s.ruleOverrides)
  const cardPayload = activeStore((s) => s.cardPayload)

  useEffect(() => {
    if (!tabId || !realStore) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const tab = useWorkspaceStore.getState().tabs.find((t) => t.id === tabId)
      if (!tab) return

      const state = realStore.getState()
      const positions: Record<string, { x: number; y: number }> = {}
      for (const [id, pos] of state.graphPositions) {
        positions[id] = pos
      }

      const doc: PersistedDocument = {
        tabId,
        entries: state.entries,
        graphPositions: positions,
        bookMeta: state.bookMeta,
        fileMeta: tab.fileMeta,
        simulatorState: state.simulatorState,
        ruleOverrides: state.ruleOverrides,
        cardPayload: state.cardPayload,
        savedAt: new Date().toISOString(),
      }

      setIsSaving(true)
      try {
        await saveDocument(doc)
        useWorkspaceStore.getState().markDirty(tabId, false)
      } catch {
        // Autosave failures are non-fatal — don't surface to user
      } finally {
        setIsSaving(false)
      }
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, bookMeta, graphPositions, simulatorState, ruleOverrides, cardPayload, tabId])

  return { isSaving }
}
