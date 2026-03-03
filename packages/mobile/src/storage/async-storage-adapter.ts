import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StorageAdapter } from '@lorewalker/core/storage'
import type {
  PersistedDocument,
  PersistedWorkspace,
  PersistedPreferences,
  PersistedProvider,
  PersistedSnapshot,
  CustomRule,
} from '@lorewalker/core'

const KEY = {
  doc: (id: string) => `doc:${id}`,
  workspace: 'workspace',
  preferences: 'preferences',
  providers: 'providers',
  snapshot: (id: string) => `snapshot:${id}`,
  customRules: 'customRules',
}

function parse<T>(raw: string | null): T | undefined {
  if (!raw) return undefined
  return JSON.parse(raw) as T
}

export class AsyncStorageAdapter implements StorageAdapter {
  // Documents

  async saveDocument(doc: PersistedDocument): Promise<void> {
    await AsyncStorage.setItem(KEY.doc(doc.tabId), JSON.stringify(doc))
  }

  async loadDocument(tabId: string): Promise<PersistedDocument | undefined> {
    return parse<PersistedDocument>(await AsyncStorage.getItem(KEY.doc(tabId)))
  }

  async deleteDocument(tabId: string): Promise<void> {
    await AsyncStorage.removeItem(KEY.doc(tabId))
    // Also remove any snapshots for this doc
    const allKeys = await AsyncStorage.getAllKeys()
    const snapKeys = allKeys.filter((k) => k.startsWith(`snapshot:`) && k.includes(`:${tabId}:`))
    if (snapKeys.length > 0) {
      await AsyncStorage.multiRemove(snapKeys)
    }
  }

  async listDocuments(): Promise<PersistedDocument[]> {
    const allKeys = await AsyncStorage.getAllKeys()
    const docKeys = allKeys.filter((k) => k.startsWith('doc:'))
    if (docKeys.length === 0) return []
    const pairs = await AsyncStorage.multiGet(docKeys)
    return pairs
      .map(([, v]) => parse<PersistedDocument>(v))
      .filter((d): d is PersistedDocument => d !== undefined)
  }

  // Workspace

  async saveWorkspace(state: PersistedWorkspace): Promise<void> {
    await AsyncStorage.setItem(KEY.workspace, JSON.stringify(state))
  }

  async loadWorkspace(): Promise<PersistedWorkspace | undefined> {
    return parse<PersistedWorkspace>(await AsyncStorage.getItem(KEY.workspace))
  }

  // Preferences

  async savePreferences(prefs: PersistedPreferences): Promise<void> {
    await AsyncStorage.setItem(KEY.preferences, JSON.stringify(prefs))
  }

  async loadPreferences(): Promise<PersistedPreferences | undefined> {
    return parse<PersistedPreferences>(await AsyncStorage.getItem(KEY.preferences))
  }

  // Providers

  async saveProviders(providers: PersistedProvider[]): Promise<void> {
    await AsyncStorage.setItem(KEY.providers, JSON.stringify(providers))
  }

  async loadProviders(): Promise<PersistedProvider[]> {
    return parse<PersistedProvider[]>(await AsyncStorage.getItem(KEY.providers)) ?? []
  }

  // Snapshots — keyed as "snapshot:<snapshotId>:<tabId>"

  async saveSnapshot(snapshot: PersistedSnapshot): Promise<void> {
    const k = `snapshot:${snapshot.id}:${snapshot.tabId}`
    await AsyncStorage.setItem(k, JSON.stringify(snapshot))
  }

  async listSnapshots(tabId?: string): Promise<PersistedSnapshot[]> {
    const allKeys = await AsyncStorage.getAllKeys()
    const snapKeys = tabId
      ? allKeys.filter((k) => k.startsWith('snapshot:') && k.endsWith(`:${tabId}`))
      : allKeys.filter((k) => k.startsWith('snapshot:'))
    if (snapKeys.length === 0) return []
    const pairs = await AsyncStorage.multiGet(snapKeys)
    return pairs
      .map(([, v]) => parse<PersistedSnapshot>(v))
      .filter((s): s is PersistedSnapshot => s !== undefined)
  }

  async deleteSnapshot(tabId: string, snapshotId: string): Promise<void> {
    await AsyncStorage.removeItem(`snapshot:${snapshotId}:${tabId}`)
  }

  // Custom Rules

  async saveCustomRules(rules: CustomRule[], disabledBuiltinIds: string[]): Promise<void> {
    await AsyncStorage.setItem(KEY.customRules, JSON.stringify({ rules, disabledBuiltinIds }))
  }

  async loadCustomRules(): Promise<{ rules: CustomRule[]; disabledBuiltinIds: string[] }> {
    const raw = await AsyncStorage.getItem(KEY.customRules)
    return parse<{ rules: CustomRule[]; disabledBuiltinIds: string[] }>(raw) ?? {
      rules: [],
      disabledBuiltinIds: [],
    }
  }

  // Cleanup

  async cleanupStaleDocuments(retentionDays: number): Promise<void> {
    const docs = await this.listDocuments()
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    const stale = docs.filter((d) => new Date(d.savedAt).getTime() < cutoff)
    for (const doc of stale) {
      await this.deleteDocument(doc.tabId)
    }
  }
}
