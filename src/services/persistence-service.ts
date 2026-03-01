import { createStore, get, set, del, keys } from 'idb-keyval'
import type { PersistedWorkspace, PersistedDocument, PersistedPreferences } from '@/types'

// Named IndexedDB store so we don't pollute the default keyval store
const store = createStore('lorewalker-db', 'keyval')

export class PersistenceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PersistenceError'
  }
}

// --- Workspace ---

export async function saveWorkspace(state: PersistedWorkspace): Promise<void> {
  try {
    await set('workspace', state, store)
  } catch (err) {
    throw new PersistenceError('Failed to save workspace', err)
  }
}

export async function loadWorkspace(): Promise<PersistedWorkspace | undefined> {
  try {
    return await get<PersistedWorkspace>('workspace', store)
  } catch (err) {
    throw new PersistenceError('Failed to load workspace', err)
  }
}

// --- Documents ---

function docKey(tabId: string): string {
  return `document:${tabId}`
}

export async function saveDocument(doc: PersistedDocument): Promise<void> {
  try {
    await set(docKey(doc.tabId), doc, store)
  } catch (err) {
    throw new PersistenceError(`Failed to save document ${doc.tabId}`, err)
  }
}

export async function loadDocument(tabId: string): Promise<PersistedDocument | undefined> {
  try {
    return await get<PersistedDocument>(docKey(tabId), store)
  } catch (err) {
    throw new PersistenceError(`Failed to load document ${tabId}`, err)
  }
}

export async function deleteDocument(tabId: string): Promise<void> {
  try {
    await del(docKey(tabId), store)
  } catch (err) {
    throw new PersistenceError(`Failed to delete document ${tabId}`, err)
  }
}

export async function listDocuments(): Promise<PersistedDocument[]> {
  try {
    const allKeys = await keys(store)
    const docKeys = allKeys.filter((k) => typeof k === 'string' && (k as string).startsWith('document:'))
    const docs = await Promise.all(
      docKeys.map((k) => get<PersistedDocument>(k as string, store))
    )
    return docs.filter((d): d is PersistedDocument => d !== undefined)
  } catch (err) {
    throw new PersistenceError('Failed to list documents', err)
  }
}

// --- Preferences ---

export async function savePreferences(prefs: PersistedPreferences): Promise<void> {
  try {
    await set('preferences', prefs, store)
  } catch (err) {
    throw new PersistenceError('Failed to save preferences', err)
  }
}

export async function loadPreferences(): Promise<PersistedPreferences | undefined> {
  try {
    return await get<PersistedPreferences>('preferences', store)
  } catch (err) {
    throw new PersistenceError('Failed to load preferences', err)
  }
}

// --- Cleanup ---

/**
 * Delete persisted documents older than retentionDays days.
 */
export async function cleanupStaleDocuments(retentionDays: number): Promise<void> {
  try {
    const docs = await listDocuments()
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    await Promise.all(
      docs
        .filter((d) => new Date(d.savedAt).getTime() < cutoff)
        .map((d) => deleteDocument(d.tabId))
    )
  } catch (err) {
    throw new PersistenceError('Failed to cleanup stale documents', err)
  }
}
