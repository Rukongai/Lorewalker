import { createStore, get, set, del, keys } from 'idb-keyval'
import type { PersistedWorkspace, PersistedDocument, PersistedPreferences, PersistedProvider, PersistedSnapshot, CustomRule } from '@/types'

// Named IndexedDB store so we don't pollute the default keyval store
const store = createStore('lorewalker-db', 'keyval')

export class PersistenceError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'PersistenceError'
    this.cause = cause
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

// --- Providers ---

export async function saveProviders(providers: PersistedProvider[]): Promise<void> {
  try {
    await set('providers', providers, store)
  } catch (err) {
    throw new PersistenceError('Failed to save providers', err)
  }
}

export async function loadProviders(): Promise<PersistedProvider[]> {
  try {
    return (await get<PersistedProvider[]>('providers', store)) ?? []
  } catch (err) {
    throw new PersistenceError('Failed to load providers', err)
  }
}

// --- Snapshots ---

function snapshotKey(tabId: string, snapshotId: string): string {
  return `snapshot:${tabId}:${snapshotId}`
}

export async function saveSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  try {
    await set(snapshotKey(snapshot.tabId, snapshot.id), snapshot, store)
  } catch (err) {
    throw new PersistenceError(`Failed to save snapshot ${snapshot.id}`, err)
  }
}

export async function listSnapshots(tabId?: string): Promise<PersistedSnapshot[]> {
  try {
    const allKeys = await keys(store)
    const prefix = tabId ? `snapshot:${tabId}:` : 'snapshot:'
    const snapKeys = allKeys.filter((k) => typeof k === 'string' && (k as string).startsWith(prefix))
    const snaps = await Promise.all(
      snapKeys.map((k) => get<PersistedSnapshot>(k as string, store))
    )
    return snaps.filter((s): s is PersistedSnapshot => s !== undefined)
  } catch (err) {
    throw new PersistenceError('Failed to list snapshots', err)
  }
}

export async function deleteSnapshot(tabId: string, snapshotId: string): Promise<void> {
  try {
    await del(snapshotKey(tabId, snapshotId), store)
  } catch (err) {
    throw new PersistenceError(`Failed to delete snapshot ${snapshotId}`, err)
  }
}

// --- Custom Rules ---

interface PersistedCustomRules {
  rules: CustomRule[]
  disabledBuiltinIds: string[]
}

export async function saveCustomRules(rules: CustomRule[], disabledBuiltinIds: string[]): Promise<void> {
  try {
    await set('custom-rules', { rules, disabledBuiltinIds } satisfies PersistedCustomRules, store)
  } catch (err) {
    throw new PersistenceError('Failed to save custom rules', err)
  }
}

export async function loadCustomRules(): Promise<{ rules: CustomRule[]; disabledBuiltinIds: string[] }> {
  try {
    const data = await get<PersistedCustomRules>('custom-rules', store)
    return data ?? { rules: [], disabledBuiltinIds: [] }
  } catch (err) {
    throw new PersistenceError('Failed to load custom rules', err)
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
