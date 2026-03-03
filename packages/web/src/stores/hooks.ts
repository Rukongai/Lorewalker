/**
 * Custom hooks for store access.
 * Provides type-safe, minimal subscription store hooks.
 */

import { useWorkspaceStore } from './workspace-store'
import { documentStoreRegistry } from './document-store-registry'
import type { DocumentState } from './document-store'
import { EMPTY_STORE } from '@/hooks/useDerivedState'

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
 * Returns null if no tab is active.
 */
export function useDocumentStore<T>(selector: (state: DocumentState) => T): T | null {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const value = activeStore(selector)
  return realStore ? value : null
}
