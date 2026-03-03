import type { StorageAdapter } from '@lorewalker/core/storage'
import type { PersistedDocument, PersistedWorkspace, PersistedPreferences, PersistedProvider, PersistedSnapshot, CustomRule } from '@/types'
import {
  saveDocument,
  loadDocument,
  deleteDocument,
  listDocuments,
  saveWorkspace,
  loadWorkspace,
  savePreferences,
  loadPreferences,
  saveProviders,
  loadProviders,
  saveSnapshot,
  listSnapshots,
  deleteSnapshot,
  saveCustomRules,
  loadCustomRules,
  cleanupStaleDocuments,
} from './persistence-service'

export class IdbStorageAdapter implements StorageAdapter {
  saveDocument(doc: PersistedDocument): Promise<void> {
    return saveDocument(doc)
  }

  loadDocument(tabId: string): Promise<PersistedDocument | undefined> {
    return loadDocument(tabId)
  }

  deleteDocument(tabId: string): Promise<void> {
    return deleteDocument(tabId)
  }

  listDocuments(): Promise<PersistedDocument[]> {
    return listDocuments()
  }

  saveWorkspace(state: PersistedWorkspace): Promise<void> {
    return saveWorkspace(state)
  }

  loadWorkspace(): Promise<PersistedWorkspace | undefined> {
    return loadWorkspace()
  }

  savePreferences(prefs: PersistedPreferences): Promise<void> {
    return savePreferences(prefs)
  }

  loadPreferences(): Promise<PersistedPreferences | undefined> {
    return loadPreferences()
  }

  saveProviders(providers: PersistedProvider[]): Promise<void> {
    return saveProviders(providers)
  }

  loadProviders(): Promise<PersistedProvider[]> {
    return loadProviders()
  }

  saveSnapshot(snapshot: PersistedSnapshot): Promise<void> {
    return saveSnapshot(snapshot)
  }

  listSnapshots(tabId?: string): Promise<PersistedSnapshot[]> {
    return listSnapshots(tabId)
  }

  deleteSnapshot(tabId: string, snapshotId: string): Promise<void> {
    return deleteSnapshot(tabId, snapshotId)
  }

  saveCustomRules(rules: CustomRule[], disabledBuiltinIds: string[]): Promise<void> {
    return saveCustomRules(rules, disabledBuiltinIds)
  }

  loadCustomRules(): Promise<{ rules: CustomRule[]; disabledBuiltinIds: string[] }> {
    return loadCustomRules()
  }

  cleanupStaleDocuments(retentionDays: number): Promise<void> {
    return cleanupStaleDocuments(retentionDays)
  }
}
