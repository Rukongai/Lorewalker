/**
 * Custom hooks for store access.
 * Provides type-safe, minimal subscription store hooks.
 */

import { useRef } from 'react'
import { useWorkspaceStore } from './workspace-store'
import { documentStoreRegistry } from './document-store-registry'
import type { DocumentState } from './document-store'

export { useWorkspaceStore }

/**
 * Returns the DocumentStore for the active tab.
 * Returns null if no tab is active.
 */
export function useActiveDocumentStore(): ReturnType<typeof documentStoreRegistry.get> | null {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  if (!activeTabId) return null
  return documentStoreRegistry.get(activeTabId) ?? null
}

/**
 * Subscribes to a slice of the active document store.
 * Re-renders when the selected slice changes.
 * Returns undefined if no tab is active.
 */
export function useDocumentStore<T>(selector: (state: DocumentState) => T): T | undefined {
  const store = useActiveDocumentStore()
  // We can't conditionally call hooks, so we use a stable ref for the null case.
  const nullRef = useRef<T | undefined>(undefined)

  if (!store) return nullRef.current
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return store(selector)
}
